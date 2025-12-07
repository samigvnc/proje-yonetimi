require('dotenv').config();
const router = require('express').Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const verify = require('../verifyToken');
const multer = require('multer');
const path = require('path');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User'); // Kullanıcı mailini bulmak için lazım


// --- MULTER AYARLARI (Her dosya tipini kabul eder) ---

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Yapılandırması
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Depolama Ayarları
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ieee-proje-dosyalari',
        resource_type: 'auto', // Hem resim hem dosya (raw) kabul et
        
        // BURASI DEĞİŞTİ:
        public_id: (req, file) => {
            // 1. Dosyanın uzantısını al (.zip, .pdf, .docx)
            const extension = path.extname(file.originalname);
            
            // 2. Dosyanın sadece adını al (uzantısız)
            const name = path.basename(file.originalname, extension);
            
            // 3. İsim + Tarih + Uzantı şeklinde birleştir
            // Örnek Çıktı: cv-1765123073453.zip
            return name + "-" + Date.now() + extension; 
        },
    },
});

const upload = multer({ storage: storage });

// 1. GÖREV OLUŞTUR (Kaptan -> Lider'e)
router.post('/create', verify, upload.single('file'), async (req, res) => {
    try {
        const { projectId, title, description, targetSubTeamName, deadline } = req.body;
        const project = await Project.findById(projectId).populate('subTeams.leader');

        if (project.leader.toString() !== req.user._id) {
            return res.status(403).json({ message: "Yetkisiz işlem." });
        }

        const targetTeam = project.subTeams.find(t => t.name === targetSubTeamName);
        if (!targetTeam || !targetTeam.leader) {
            return res.status(404).json({ message: "Ekip veya lider bulunamadı." });
        }

        const newTask = new Task({
            project: projectId,
            title,
            description,
            file: req.file ? req.file.path : null,
            originalFileName: req.file ? req.file.originalname : null,
            createdBy: req.user._id,
            targetSubTeam: targetSubTeamName,
            currentOwner: targetTeam.leader._id, // İlk sorumluluk Liderde
            status: 'Liderde',
            deadline: deadline
        });

        await newTask.save();

        // --- MAİL GÖNDERİMİ (Kaptan -> Lider) ---
        // Liderin mail adresini bulmamız lazım
        const leaderUser = await User.findById(targetTeam.leader);
        if (leaderUser) {
            sendEmail(
                leaderUser.email,
                "Yeni Bir Görev Atandı!",
                `Merhaba <b>${leaderUser.name}</b>,<br><br>
                 Kaptan tarafından ekibine <b>"${title}"</b> başlıklı yeni bir görev atandı.<br>
                 Detayları görmek ve görevi ekibine dağıtmak için panele giriş yap.`
            );
        }

        res.status(200).json(newTask);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. GÖREVİ EKİBE ATA (Lider -> Çoklu Üye)
// 2. GÖREVİ EKİBE ATA (Lider -> Çoklu Üye + Özel Notlar)
router.put('/delegate', verify, async (req, res) => {
    try {
        const { taskId, assignments } = req.body; // assignments: [{ memberId, note }, ...] formatında gelecek
        const task = await Task.findById(taskId);

        // Yetki Kontrolü
        if (task.currentOwner.toString() !== req.user._id) return res.status(403).json({ message: "Yetkisiz." });

        // Gelen listeyi veritabanı formatına çevir
        task.assignedMembers = assignments.map(item => ({
            member: item.memberId,
            instruction: item.note, // Özel notu kaydet
            isCompleted: false
        }));

        task.status = 'Uyelerde';
        task.currentOwner = null;
        await task.save();

        // --- MAİL GÖNDERİMİ (Lider -> Üyeler) ---
        // Atanan kişilerin maillerini bulup tek tek atalım
        assignments.forEach(async (assignment) => {
            const memberUser = await User.findById(assignment.memberId);
            if (memberUser) {
                sendEmail(
                    memberUser.email,
                    "Sana Bir Görev Atandı!",
                    `Merhaba <b>${memberUser.name}</b>,<br><br>
                    sana <b>"${task.title}"</b> görevi atandı.<br>
                     <b>Özel Not:</b> ${assignment.note || 'Yok'}<br><br>
                     Başarılar dileriz.`
                );
            }
        });
        // ----------------------------------------

        res.status(200).json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. GÖREVİ TAMAMLA (Üye İşlemi)
router.put('/complete', verify, upload.single('file'), async (req, res) => {
    try {
        const { taskId, note } = req.body; // note: "Şunları yaptım"
        const task = await Task.findById(taskId);

        const memberIndex = task.assignedMembers.findIndex(m => m.member.toString() === req.user._id);
        if (memberIndex === -1) return res.status(403).json({ message: "Bu görev size atanmamış." });

        // Verileri güncelle
        task.assignedMembers[memberIndex].isCompleted = true;
        task.assignedMembers[memberIndex].completedAt = Date.now();
        task.assignedMembers[memberIndex].completionNote = note; // Notu kaydet
        
        // Dosya varsa kaydet
        if (req.file) {
            task.assignedMembers[memberIndex].completionFile = req.file.path;
            task.assignedMembers[memberIndex].originalCompletionFileName = req.file.originalname;
        }

        // KONTROL: Herkes tamamladı mı?
        const allDone = task.assignedMembers.every(m => m.isCompleted);
        
        if (allDone) {
            task.status = 'LiderOnayinda'; 
            // Lideri tekrar sorumlu yap
            const project = await Project.findById(task.project);
            const team = project.subTeams.find(t => t.name === task.targetSubTeam);
            if (team && team.leader) {
                task.currentOwner = team.leader; 
            }
        }

        await task.save();
        res.status(200).json({ message: "İşlem başarılı", task });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. LİDER ONAYI (Lider -> Tamamlandı)
router.put('/approve', verify, async (req, res) => {
    try {
        const { taskId } = req.body;
        const task = await Task.findById(taskId);

        if (task.currentOwner.toString() !== req.user._id) return res.status(403).json({ message: "Yetkisiz." });

        // ARTIK TAMAMLANMIYOR, KAPTANA GİDİYOR
        task.status = 'KaptanOnayinda';
        
        // Proje kaptanını bul ve sorumlu yap
        const project = await Project.findById(task.project);
        task.currentOwner = project.leader; 

        await task.save();
        res.status(200).json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/captain-resolve', verify, async (req, res) => {
    try {
        const { taskId, decision, revisionNote } = req.body; // decision: 'approve' veya 'revision'
        const task = await Task.findById(taskId);

        // Yetki: Sadece o anki sorumlu (Kaptan)
        if (task.currentOwner.toString() !== req.user._id) return res.status(403).json({ message: "Yetkisiz." });

        if (decision === 'approve') {
            // GÖREV BİTTİ
            task.status = 'Tamamlandi';
            task.completedAt = Date.now();
        } else if (decision === 'revision') {
            // REVİZYON: Lidere geri gönder
            task.status = 'Liderde';
            
            // Lideri bul
            const project = await Project.findById(task.project);
            const team = project.subTeams.find(t => t.name === task.targetSubTeam);
            task.currentOwner = team.leader;

            // İstersen burada üyelere özel "tamamlandı" işaretlerini kaldırabilirsin ki tekrar yapsınlar:
            // task.assignedMembers.forEach(m => m.isCompleted = false); 
            // Ama şimdilik kaldırmayalım, lider karar versin kime atayacağına.
        }

        await task.save();
        res.status(200).json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. GÖREVLERİMİ GETİR (Mantık değişti)
router.get('/my-tasks', verify, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const tasks = await Task.find({
            $or: [
                { currentOwner: userId }, // Liderdeyse veya Onaydaysa Lider Görür
                { 'assignedMembers.member': userId } // Üyedeyse Üye Görür
            ]
        })
        .populate('project', 'name')
        .populate('assignedMembers.member', 'name'); // Kimlerin durumu ne görmek için

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 6. PROJENİN TÜM GÖREVLERİNİ GETİR (Proje ID'sine göre)
router.get('/project/:projectId', verify, async (req, res) => {
    try {
        const tasks = await Task.find({ project: req.params.projectId })
            .populate('assignedMembers.member', 'name') // Kime atanmış?
            .populate('currentOwner', 'name') // Şu an kimde?
            .sort({ createdAt: -1 }); // En yenisi en üstte

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
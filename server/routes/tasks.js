require('dotenv').config();
const router = require('express').Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const verify = require('../verifyToken');
const multer = require('multer');
const path = require('path');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User'); 

// --- MULTER & CLOUDINARY ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ieee-proje-dosyalari',
        resource_type: 'auto', 
        public_id: (req, file) => {
            const extension = path.extname(file.originalname);
            const name = path.basename(file.originalname, extension);
            return name + "-" + Date.now() + extension; 
        },
    },
});

const upload = multer({ storage: storage });

// ---------------------------------------------------------
// 1. GÖREV OLUŞTURMA (TEK ROTA - KESİN AYRIM)
// ---------------------------------------------------------
router.post('/create', verify, upload.single('file'), async (req, res) => {
    try {
        const { projectId, title, description, targetSubTeamName, deadline } = req.body;
        
        // Frontend'den gelen assignedTo'yu diziye çevir
        let assignedToMembers = [];
        if (req.body.assignedTo) {
            assignedToMembers = Array.isArray(req.body.assignedTo) 
                ? req.body.assignedTo 
                : req.body.assignedTo.split(',');
            assignedToMembers = assignedToMembers.filter(id => id && id !== 'undefined');
        }

        const project = await Project.findById(projectId).populate('subTeams.leader');
        if (!project) return res.status(404).json({ message: "Proje bulunamadı." });

        // Kimlik Kontrolü
        const projectLeaderId = project.leader._id ? project.leader._id.toString() : project.leader.toString();
        const requestUserId = req.user.id || req.user._id;
        const isCaptain = projectLeaderId === requestUserId;

        // --- SENARYO A: KAPTAN -> EKİP LİDERİNE GÖREV VERİYOR ---
        if (isCaptain && targetSubTeamName) {
            const targetTeam = project.subTeams.find(t => t.name === targetSubTeamName);
            
            if (!targetTeam || !targetTeam.leader) {
                return res.status(400).json({ message: "Seçilen ekibin lideri atanmamış." });
            }

            const newTask = new Task({
                project: projectId,
                title,
                description,
                file: req.file ? req.file.path : null,
                originalFileName: req.file ? req.file.originalname : null,
                createdBy: requestUserId,
                targetSubTeam: targetSubTeamName,
                // Sorumluluk Liderde başlar
                currentOwner: targetTeam.leader._id, 
                status: 'Liderde', 
                deadline: deadline,
                assignedMembers: [] 
            });

            await newTask.save();
            await Project.findByIdAndUpdate(projectId, { $push: { tasks: newTask._id } });

            // Mail
            const leaderUser = await User.findById(targetTeam.leader._id);
            if (leaderUser) sendEmail(leaderUser.email, "Yeni Görev!", `Kaptan ekibine <b>"${title}"</b> görevini atadı.`).catch(console.error);

            return res.status(200).json(newTask);
        }

        // --- SENARYO B: LİDER -> ÜYELERE GÖREV VERİYOR ---
        else if (assignedToMembers.length > 0) {
            
            // Liderin takım ismini bul (Zorunlu alan)
            let myTeamName = targetSubTeamName || "Genel";
            if (!targetSubTeamName) {
                const myTeam = project.subTeams.find(t => t.leader && t.leader._id.toString() === requestUserId);
                if (myTeam) myTeamName = myTeam.name;
            }

            const membersList = assignedToMembers.map(mId => ({
                member: mId,
                isCompleted: false
            }));

            const newTask = new Task({
                project: projectId,
                title,
                description,
                file: req.file ? req.file.path : null,
                originalFileName: req.file ? req.file.originalname : null,
                createdBy: requestUserId,
                targetSubTeam: myTeamName, 
                // Lider oluşturduğu için sorumluluk Liderde kalmalı (Onaylamak için)
                currentOwner: requestUserId, 
                status: 'Uyelerde', 
                deadline: deadline,
                assignedMembers: membersList 
            });

            await newTask.save();
            await Project.findByIdAndUpdate(projectId, { $push: { tasks: newTask._id } });

            assignedToMembers.forEach(async (memberId) => {
                const u = await User.findById(memberId);
                if (u) sendEmail(u.email, "Yeni Görev!", `Liderin sana <b>"${title}"</b> görevini atadı.`).catch(console.error);
            });

            return res.status(200).json(newTask);
        }

        else {
            return res.status(400).json({ message: "Eksik bilgi: Hedef ekip veya üye seçilmedi." });
        }

    } catch (err) {
        console.error("Create Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// --- 2. DELEGATE (Lider Dağıtım) ---
router.put('/delegate', verify, async (req, res) => {
    try {
        const { taskId, assignments } = req.body;
        const task = await Task.findById(taskId);
        const userId = req.user.id || req.user._id;

        if (task.currentOwner.toString() !== userId) return res.status(403).json({ message: "Yetkisiz." });

        task.assignedMembers = assignments.map(item => ({
            member: item.memberId,
            instruction: item.note,
            isCompleted: false
        }));

        task.status = 'Uyelerde';
        // Sorumluluk Liderde kalsın
        task.currentOwner = userId; 
        
        await task.save();

        assignments.forEach(async (assignment) => {
            const u = await User.findById(assignment.memberId);
            if (u) sendEmail(u.email, "Yeni Görev!", `Liderin sana <b>"${task.title}"</b> görevini atadı.`).catch(console.error);
        });

        res.status(200).json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- 3. TAMAMLA (Üye) ---
router.put('/complete', verify, upload.single('file'), async (req, res) => {
    try {
        const { taskId, note } = req.body;
        const userId = req.user.id || req.user._id;
        
        await Task.updateOne(
            { _id: taskId, "assignedMembers.member": userId },
            { 
                $set: { 
                    "assignedMembers.$.isCompleted": true,
                    "assignedMembers.$.completionNote": note,
                    "assignedMembers.$.completionFile": req.file ? req.file.path : "",
                    "assignedMembers.$.originalCompletionFileName": req.file ? req.file.originalname : "",
                    "assignedMembers.$.completedAt": Date.now()
                }
            }
        );

        const task = await Task.findById(taskId);
        const allDone = task.assignedMembers.every(m => m.isCompleted);
        
        if (allDone) {
            task.status = 'LiderOnayinda';
            await task.save();
        }

        res.status(200).json({ message: "Başarılı" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- 4. LİDER ONAY / REVİZYON (AKILLI SİSTEM) ---
router.put('/leader-resolve', verify, async (req, res) => {
    try {
        const { taskId, decision, newDeadline, revisionNote } = req.body; 
        
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

        const project = await Project.findById(task.project);
        
        // Görevi Kaptan mı oluşturdu?
        const isCaptainTask = task.createdBy.toString() === project.leader.toString();

        let updateQuery = {};
        
        if (decision === 'approve') {
            if (isCaptainTask) {
                // Kaptanın görevi -> KAPTAN ONAYINA GİDER
                updateQuery = { 
                    status: 'KaptanOnayinda',
                    currentOwner: project.leader // Sorumluluğu Kaptana devret
                };
            } else {
                // Liderin görevi -> BİTER
                updateQuery = { 
                    status: 'Tamamlandi', 
                    completedAt: Date.now() 
                };
            }
        } 
        else if (decision === 'revision') {
            updateQuery = { 
                status: 'Uyelerde',
                deadline: newDeadline,
                description: `⚠️ [LİDER REVİZYONU]: ${revisionNote}\n\n` + task.description
            };
            
            await Task.updateOne(
                { _id: taskId },
                { $set: { "assignedMembers.$[].isCompleted": false } } 
            );
            // Görev kime atanmışsa onlara mail at
            task.assignedMembers.forEach(async (assignment) => {
                const memberUser = await User.findById(assignment.member);
                if (memberUser) {
                    sendEmail(
                        memberUser.email,
                        "Görev Revizyon Talebi", // Konu
                        `Merhaba <b>${memberUser.name}</b>,<br><br>
                         Liderin <b>"${task.title}"</b> görevi için revizyon talep etti.<br><br>
                         <b>Revizyon Sebebi:</b> ${revisionNote}<br>
                         <b>Yeni Teslim Tarihi:</b> ${new Date(newDeadline).toLocaleDateString()}<br><br>
                         Lütfen gerekli düzeltmeleri yapıp tekrar gönder.`
                    ).catch(err => console.log("Revizyon mail hatası:", err));
                }
            });
            // ------------------------------------------
        }

        const updatedTask = await Task.findByIdAndUpdate(taskId, { $set: updateQuery }, { new: true });
        res.status(200).json(updatedTask);

    } catch (err) {
        res.status(500).json(err);
    }
});

// --- 5. KAPTAN ONAY / REVİZYON ---
router.put('/captain-resolve', verify, async (req, res) => {
    try {
        const { taskId, decision, newDeadline, revisionNote } = req.body;
        const task = await Task.findById(taskId);
        const userId = req.user.id || req.user._id;

        if (task.currentOwner.toString() !== userId) return res.status(403).json({ message: "Yetkisiz." });

        if (decision === 'approve') {
            task.status = 'Tamamlandi';
            task.completedAt = Date.now();
        } 
        else if (decision === 'revision') {
            task.status = 'LiderOnayinda';
            
            if (newDeadline) task.deadline = newDeadline;
            if (revisionNote) task.description = `🚨 [KAPTAN REVİZYONU]: ${revisionNote}\n\n` + task.description;

            // Sorumluluğu Lidere geri ver
            const project = await Project.findById(task.project).populate('subTeams.leader');
            const team = project.subTeams.find(t => t.name === task.targetSubTeam);
            if (team && team.leader) {
                task.currentOwner = team.leader._id;

                // --- LİDERE MAİL GÖNDER ---
                sendEmail(
                    team.leader.email, // Liderin maili
                    "Kaptan Revizyon Talebi", // Konu
                    `Merhaba <b>${team.leader.name}</b>,<br><br>
                     Kaptan, <b>"${task.title}"</b> görevi için revizyon talep etti ve görevi sana geri yönlendirdi.<br><br>
                     <b>Kaptan Notu:</b> ${revisionNote}<br>
                     <b>Yeni Deadline:</b> ${new Date(newDeadline).toLocaleDateString()}<br><br>
                     Lütfen paneline girerek görevi üyelerine tekrar dağıt (Revizyon Ver) veya gerekli düzenlemeleri yap.`
                ).catch(err => console.log("Kaptan-Lider mail hatası:", err));
                // --------------------------
            }
        }

        await task.save();
        res.status(200).json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- VERİ GETİRME ---
router.get('/my-tasks', verify, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        
        const tasks = await Task.find({
            $or: [
                { currentOwner: userId }, // Sorumluysam (Lider/Kaptan)
                { 'assignedMembers.member': userId } // Üyeysem
            ]
        })
        .populate('project', 'name')
        .populate('assignedMembers.member', 'name')
        .populate('currentOwner', 'name') // Frontend'de kontrol için lazım
        .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/project/:projectId', verify, async (req, res) => {
    try {
        const tasks = await Task.find({ project: req.params.projectId })
            .populate('assignedMembers.member', 'name')
            .populate('currentOwner', 'name')
            .sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- 7. GÖREV SİLME ---
router.delete('/:id', verify, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Görev bulunamadı." });

        // Yetki Kontrolü: Sadece görevin şu anki sahibi (Leader/Kaptan) 
        // veya görevi ilk oluşturan kişi silebilir.
        const userId = req.user.id || req.user._id;

        if (task.currentOwner.toString() !== userId && task.createdBy.toString() !== userId) {
            return res.status(403).json({ message: "Bu görevi silme yetkiniz yok." });
        }

        // 1. Görevi Sil
        await Task.findByIdAndDelete(req.params.id);

        // 2. Projenin 'tasks' listesinden de bu görevi çıkar (Temizlik)
        await Project.findByIdAndUpdate(task.project, {
            $pull: { tasks: req.params.id }
        });

        res.status(200).json({ message: "Görev başarıyla silindi." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
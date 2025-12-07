// server/routes/projects.js
const router = require('express').Router();
const Project = require('../models/Project');
const verify = require('../verifyToken'); // Az önce oluşturduğumuz güvenlik kontrolü

// YARDIMCI FONKSİYON: 16 Haneli Rastgele Kod Üretici
function generateJoinCode(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// 1. PROJE OLUŞTUR (Sadece giriş yapmış kullanıcılar)
router.post('/create', verify, async (req, res) => {
    // 16 haneli eşsiz bir kod üret
    const uniqueCode = generateJoinCode(16);

    const newProject = new Project({
        name: req.body.name,
        description: req.body.description,
        leader: req.user._id, // Token'dan gelen kullanıcı ID'si kaptan olur
        joinCode: uniqueCode,
        members: [req.user._id] // Kaptan aynı zamanda ilk üyedir
    });

    try {
        const savedProject = await newProject.save();
        res.status(200).json(savedProject);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 2. KOD İLE PROJEYE KATIL
router.post('/join', verify, async (req, res) => {
    const { joinCode, subTeamName } = req.body; // Artık ekip ismi de geliyor

    try {
        const project = await Project.findOne({ joinCode: joinCode });
        if (!project) return res.status(404).json({ message: "Geçersiz proje kodu." });

        // Zaten üye mi?
        if (project.members.includes(req.user._id)) {
            return res.status(400).json({ message: "Zaten bu projenin üyesisiniz." });
        }

        // 1. Ana projeye üyeyi ekle
        project.members.push(req.user._id);

        // 2. Eğer bir alt ekip seçtiyse oraya da ekle
        if (subTeamName) {
            const team = project.subTeams.find(t => t.name === subTeamName);
            if (team) {
                team.members.push(req.user._id);
            }
        }

        await project.save();
        res.status(200).json({ message: "Projeye ve ekibe katıldınız!", project });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. KULLANICININ PROJELERİNİ LİSTELE (Projelerim Ekranı İçin)
router.get('/', verify, async (req, res) => {
    try {
        // Kullanıcının Lider OLDUĞU veya Üye OLDUĞU projeleri bul
        const projects = await Project.find({ members: req.user._id });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. TEK BİR PROJENİN DETAYLARINI GETİR (Dashboard İçin)
router.get('/:id', verify, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('leader', 'name email')
            .populate('members', 'name email phone') 
            // BURASI ÇOK ÖNEMLİ: Alt ekiplerin hem üyelerini hem liderini isimleriyle getir
            .populate({
                path: 'subTeams.members',
                select: 'name email'
            })
            .populate({
                path: 'subTeams.leader',
                select: 'name'
            });

        res.json(project);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. ALT EKİP OLUŞTUR (Sadece Kaptan Yapabilir)
router.post('/:id/subteams', verify, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        // İşlemi yapan kişi kaptan mı kontrol et
        if (project.leader.toString() !== req.user._id) {
            return res.status(403).json({ message: "Sadece takım kaptanı alt ekip oluşturabilir." });
        }

        const newSubTeam = {
            name: req.body.name, // Örn: "Mekanik Ekibi"
            members: []
        };

        project.subTeams.push(newSubTeam);
        await project.save();

        res.status(200).json(project);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ... (projects.js dosyasının mevcut kodlarının altına, export'tan önce ekle) ...

// 6. ALT EKİP LİDERİ ATAMA (Sadece Ana Kaptan)
router.put('/:id/assign-leader', verify, async (req, res) => {
    try {
        const { subTeamName, newLeaderId } = req.body; // Hangi ekip, Kimi lider yapacağız?
        const project = await Project.findById(req.params.id);

        // 1. Yetki Kontrolü: İsteği yapan kişi ana kaptan mı?
        if (project.leader.toString() !== req.user._id) {
            return res.status(403).json({ message: "Yetkisiz işlem. Sadece proje kaptanı lider atayabilir." });
        }

        // 2. İlgili alt ekibi bul
        const subTeam = project.subTeams.find(t => t.name === subTeamName);
        if (!subTeam) return res.status(404).json({ message: "Alt ekip bulunamadı." });

        // 3. Lideri güncelle
        subTeam.leader = newLeaderId;
        
        await project.save();
        res.status(200).json({ message: `${subTeamName} lideri güncellendi.`, project });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 7. DUYURU YAYINLA (Ana Kaptan veya Alt Ekip Liderleri)
router.post('/:id/announcements', verify, async (req, res) => {
    try {
        const { title, content } = req.body;
        const project = await Project.findById(req.params.id);

        const userId = req.user._id;

        // Yetki Kontrolü:
        // 1. Ana Kaptan mı?
        const isMainLeader = project.leader.toString() === userId;
        
        // 2. Herhangi bir alt ekibin lideri mi?
        const isSubTeamLeader = project.subTeams.some(team => 
            team.leader && team.leader.toString() === userId
        );

        if (!isMainLeader && !isSubTeamLeader) {
            return res.status(403).json({ message: "Sadece kaptan veya ekip liderleri duyuru yapabilir." });
        }

        // Duyuruyu ekle
        const newAnnouncement = {
            title,
            content,
            author: userId,
            authorName: req.user.name // Token'dan gelen isim
        };

        project.announcements.push(newAnnouncement);
        await project.save();

        res.status(200).json(project);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/preview/:code', verify, async (req, res) => {
    try {
        const project = await Project.findOne({ joinCode: req.params.code })
            .select('name description subTeams.name'); // Sadece isim ve ekip adlarını getir
        
        if (!project) return res.status(404).json({ message: "Geçersiz kod." });
        
        res.status(200).json(project);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id/members/:memberId', verify, async (req, res) => {
    try {
        const { id, memberId } = req.params;
        const project = await Project.findById(id);

        // Yetki: Sadece Kaptan silebilir
        if (project.leader.toString() !== req.user._id) {
            return res.status(403).json({ message: "Sadece kaptan üye silebilir." });
        }

        // Kaptan kendini silemez (Proje silinmeli bunun yerine)
        if (memberId === project.leader.toString()) {
            return res.status(400).json({ message: "Kaptan projeden ayrılamaz." });
        }

        // 1. Ana üye listesinden çıkar
        project.members = project.members.filter(m => m.toString() !== memberId);

        // 2. Alt ekiplerden çıkar ve Liderse liderliğini düşür
        project.subTeams.forEach(team => {
            // Üyeyi ekipten sil
            team.members = team.members.filter(m => m.toString() !== memberId);
            
            // Eğer bu kişi o ekibin lideriyse, liderliği sıfırla
            if (team.leader && team.leader.toString() === memberId) {
                team.leader = null;
            }
        });

        await project.save();
        res.status(200).json(project);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 9. DUYURU SİL (Tekil)
router.delete('/:id/announcements/:annId', verify, async (req, res) => {
    try {
        const { id, annId } = req.params;
        const project = await Project.findById(id);

        // Yetki Kontrolü:
        // 1. Ana Kaptan silebilir.
        // 2. Duyuruyu yazan kişi (Lider) silebilir.
        const isCaptain = project.leader.toString() === req.user._id;
        
        // Duyuruyu bul
        const announcement = project.announcements.id(annId);
        if (!announcement) return res.status(404).json({ message: "Duyuru bulunamadı." });

        const isAuthor = announcement.author.toString() === req.user._id;

        if (!isCaptain && !isAuthor) {
            return res.status(403).json({ message: "Bunu silmeye yetkiniz yok." });
        }

        // Duyuruyu diziden çıkar
        project.announcements.pull(annId);
        await project.save();

        res.status(200).json(project);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 10. TÜM DUYURULARI SİL (Sadece Kaptan)
router.delete('/:id/announcements', verify, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        // Sadece Kaptan hepsini silebilir
        if (project.leader.toString() !== req.user._id) {
            return res.status(403).json({ message: "Sadece kaptan panoyu temizleyebilir." });
        }

        project.announcements = []; // Diziyi boşalt
        await project.save();

        res.status(200).json(project);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
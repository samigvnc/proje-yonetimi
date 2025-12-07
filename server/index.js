const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // Node.js path modülü

const authRoute = require('./routes/auth');
const projectRoute = require('./routes/projects');
const taskRoute = require('./routes/tasks'); // <-- YENİ EKLENDİ

const cron = require('node-cron');
const sendEmail = require('./utils/sendEmail');
const Task = require('./models/Task');
const User = require('./models/User');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Uploads klasörünü statik yap (Tarayıcıdan erişilebilsin diye)
// Örn: https://proje-yonetimi.onrender.com/uploads/resim.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // <-- YENİ EKLENDİ

// ROTALAR
app.use('/api/auth', authRoute);
app.use('/api/projects', projectRoute);
app.use('/api/tasks', taskRoute); // <-- YENİ EKLENDİ

app.get('/', (req, res) => {
    res.send('SAP Proje Yönetimi API Çalışıyor');
});


// --- ZAMANLANMIŞ GÖREV (CRON JOB) ---
// Her saat başı çalışır (Örn: 14:00, 15:00...)
cron.schedule('0 * * * *', async () => {
    console.log('⏰ 24 Saat kontrolü yapılıyor...');
    
    try {
        const now = new Date();
        const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Şu andan 24 saat sonrası

        // Kriterler:
        // 1. Durumu "Uyelerde" olan (Henüz bitmemiş)
        // 2. Deadline'ı şu an ile 24 saat sonrası arasında olan
        // 3. (Önemli) Daha önce uyarı maili atılmamış olan (Bunu engellemek için Task modeline bir alan ekleyeceğiz)
        
        const tasksDueSoon = await Task.find({
        status: 'Uyelerde',
        deadline: { $gt: now, $lte: next24Hours },
        reminderSent: { $ne: true } 
        }).populate('assignedMembers.member');

        for (const task of tasksDueSoon) {
            // Görevdeki tamamlamayan üyelere mail at
            for (const assignment of task.assignedMembers) {
                if (!assignment.isCompleted && assignment.member) {
                    await sendEmail(
                        assignment.member.email,
                        "⏳ SON 24 SAAT UYARISI",
                        `Merhaba <b>${assignment.member.name}</b>,<br><br>
                         <b>"${task.title}"</b> görevinin teslim tarihine 24 saatten az kaldı!<br>
                         Lütfen görevi tamamlayıp sisteme yükle.`
                    );
                }
            }

            // Görevi "uyarıldı" olarak işaretle ki bir sonraki saat tekrar mail atmasın
            task.reminderSent = true;
            await task.save();
        }

    } catch (err) {
        console.error("Cron hatası:", err);
    }
});


mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sap-proje-yonetimi')
    .then(() => console.log('MongoDB veritabanına bağlanıldı'))
    .catch((err) => console.error('Veritabanı bağlantı hatası:', err));

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
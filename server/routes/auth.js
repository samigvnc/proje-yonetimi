// server/routes/auth.js

const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // .env dosyasını okumak için

// KAYIT OL (REGISTER)
router.post('/register', async (req, res) => {
    try {
        // Frontend'den gelen verileri al
        const { name, email, phone, password, role } = req.body; // role bilgisini de alabiliriz (Opsiyonel)

        // E-posta daha önce kayıtlı mı kontrol et
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "Bu e-posta adresi zaten kayıtlı." });
        }

        // Şifreyi şifrele (Hashleme)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Yeni kullanıcıyı oluştur
        const newUser = new User({
            name,
            email,
            phone,
            password: hashedPassword,
            role: role || 'Uye' // Eğer rol gelmezse varsayılan 'Uye' olsun
        });

        // Veritabanına kaydet
        const savedUser = await newUser.save();
        
        res.status(201).json({ message: "Kullanıcı başarıyla oluşturuldu.", userId: savedUser._id });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GİRİŞ YAP (LOGIN)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kullanıcıyı bul
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Kullanıcı bulunamadı." });
        }

        // Şifreyi kontrol et
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) {
            return res.status(400).json({ message: "Hatalı şifre." });
        }

        // --- TOKEN OLUŞTURMA (GÜNCELLENDİ) ---
        // Bu token kullanıcının kimliğini ve rolünü kanıtlar
        const token = jwt.sign(
            { 
                _id: user._id,      // Standart MongoDB ID'si
                id: user._id,       // Kodda 'req.user.id' diye ararsan hata almamak için yedek
                role: user.role,    // Yetki kontrolleri için ROL bilgisi ŞART
                name: user.name,
                email: user.email
            }, 
            process.env.JWT_SECRET || "gizli_anahtar_buraya", 
            { expiresIn: '30d' } // Token 30 gün geçerli olsun (Sürekli giriş yapmamak için)
        );

        // Frontend'e dönülecek yanıt (Header'a da token ekliyoruz)
        res.header('auth-token', token).status(200).json({ 
            token: token, 
            user: { 
                id: user._id, 
                _id: user._id, // Frontend'de hangisini kullanırsan kullan çalışsın
                name: user.name, 
                email: user.email,
                role: user.role // Frontend'de "Kaptan Paneli"ni göstermek için bu lazım
            } 
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
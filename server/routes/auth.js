// server/routes/auth.js
const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// KAYIT OL (REGISTER)
router.post('/register', async (req, res) => {
    try {
        // Frontend'den gelen verileri al
        const { name, email, phone, password } = req.body;

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
            password: hashedPassword
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

        // Token oluştur (JWT) - Bu token kullanıcının giriş yaptığını kanıtlar
        const token = jwt.sign(
            { _id: user._id, name: user.name }, 
            process.env.JWT_SECRET || "gizli_anahtar_buraya", // .env dosyasında tutmak daha güvenlidir
            { expiresIn: '1d' } // Token 1 gün geçerli olsun
        );

        res.status(200).json({ 
            token, 
            user: { id: user._id, name: user.name, email: user.email } 
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
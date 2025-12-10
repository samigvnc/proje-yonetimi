// server/routes/users.js

const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // Şifreleme için
const verify = require('../verifyToken'); // Güvenlik (Sadece giriş yapanlar)

// KULLANICI GÜNCELLEME
router.put('/:id', verify, async (req, res) => {
    // Güvenlik: Sadece kendi hesabını güncelleyebilirsin
    if (req.user.id !== req.params.id) {
        return res.status(403).json("Sadece kendi hesabını güncelleyebilirsin!");
    }

    try {
        // Eğer şifre de değiştirilmek isteniyorsa, yeni şifreyi hashle (kriptola)
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            req.body.password = await bcrypt.hash(req.body.password, salt);
        }

        // Bilgileri güncelle
        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            $set: req.body,
        }, { new: true }); // Güncel halini geri döndür

        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(500).json(err);
    }
});

// TEK KULLANICIYI GETİR (Profil bilgilerini doldurmak için)
router.get('/:id', verify, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        const { password, ...other } = user._doc; // Şifreyi gönderme (Gizlilik)
        res.status(200).json(other);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
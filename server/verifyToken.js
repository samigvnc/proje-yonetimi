// server/verifyToken.js
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Header'dan token'ı al
    const token = req.header('auth-token');
    if (!token) return res.status(401).send('Erişim Reddedildi: Giriş yapmanız gerekiyor.');

    try {
        // Token'ı doğrula (Gizli anahtarımızla)
        const verified = jwt.verify(token, process.env.JWT_SECRET || "gizli_anahtar_buraya");
        req.user = verified; // Doğrulanmış kullanıcı bilgisini isteğe ekle
        next(); // İşleme devam et
    } catch (err) {
        res.status(400).send('Geçersiz Token');
    }
};
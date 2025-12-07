const nodemailer = require("nodemailer");
require('dotenv').config();

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587, // 465 yerine 587 (TLS) kullanıyoruz, daha esnektir
      secure: false, // 587 için false olmalı
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        ciphers: "SSLv3", // Eski protokol uyumluluğu
        rejectUnauthorized: false, // Sertifika hatalarını görmezden gel
      },
      family: 4 // <--- İŞTE SİHİRLİ DEĞNEK: Sadece IPv4 kullanmaya zorla
    });

    // Mail gönder (await burada kalsın, çağıran yerden kaldıracağız)
    await transporter.sendMail({
      from: `"SAP Proje Yönetimi" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #2c3e50;">SAP Proje Bildirimi</h2>
            <p style="font-size: 16px;">${text}</p>
            <br>
            <small style="color: #888;">Bu mail otomatik olarak gönderilmiştir.</small>
        </div>
      `,
    });

    console.log(`✅ Mail başarıyla gönderildi: ${to}`);
  } catch (error) {
    console.error("❌ Mail Gönderim Hatası:", error.message);
  }
};

module.exports = sendEmail;
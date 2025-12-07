const nodemailer = require("nodemailer");
require('dotenv').config();

const sendEmail = async (to, subject, text) => {
  try {
    // Hazır Gmail Servisi Kullanıyoruz
    const transporter = nodemailer.createTransport({
      service: 'gmail', // <--- EN ÖNEMLİ DEĞİŞİKLİK
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Bazı güvenlik sertifikası hatalarını görmezden gel
      tls: {
        rejectUnauthorized: false
      },
      // IPv4 kullanmaya zorla (Render için kritik)
      family: 4 
    });

    console.log(`📨 Mail gönderimi deneniyor: ${to}`);

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
    console.error("❌ Mail Gönderim Hatası:", error);
  }
};

module.exports = sendEmail;
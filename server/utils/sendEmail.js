// server/utils/sendEmail.js
const nodemailer = require("nodemailer");
require('dotenv').config();

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // Direkt sunucu adresi
      port: 465,              // Güvenli SSL portu (Render bunu sever)
      secure: true,           // 465 için true olmak zorundadır
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Maili gönder
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
    // Tüm hatayı basıp logları kirletmek yerine sadece mesajı basıyoruz
  }
};

module.exports = sendEmail;
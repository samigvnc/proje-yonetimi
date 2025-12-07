const nodemailer = require("nodemailer");
require('dotenv').config();

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST, // smtp-relay.brevo.com
      port: process.env.EMAIL_PORT, // 587
      secure: false, // 587 için false
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log(`📨 Mail gönderiliyor: ${to}`);

    await transporter.sendMail({
      from: `"SAP Proje Yönetimi" <${process.env.EMAIL_USER}>`, // Gönderen adresi (Brevo hesabındaki mail)
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
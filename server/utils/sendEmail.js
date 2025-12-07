// server/utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: '"IEEE Proje Yönetimi" <ieeekyssistem@gmail.com>',
      to: to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #2c3e50;">IEE Proje Bildirimi</h2>
            <p style="font-size: 16px;">${text}</p>
            <br>
            <small style="color: #888;">Bu mail otomatik olarak gönderilmiştir.</small>
        </div>
      `, 
    });

    console.log(`📧 Mail gönderildi: ${to}`);
  } catch (error) {
    console.log("Mail gönderilemedi:", error);
  }
};

module.exports = sendEmail;
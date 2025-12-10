// client/src/apiConfig.js

const hostname = window.location.hostname;

export const API_URL = (hostname === 'localhost' || hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'  // Bilgisayarındaysan burayı kullan
    : 'https://proje-yonetimi.onrender.com/api'; // Canlıdaysan burayı kullan
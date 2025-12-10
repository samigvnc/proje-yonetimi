// client/src/pages/Register.js
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../apiConfig';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: ''
    });

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Backend'e istek atıyoruz (Port 5000)
            await axios.post(`${API_URL}/auth/register`, formData);
            toast.success('Kayıt başarılı! Giriş yapabilirsiniz.');
            navigate('/'); // Giriş sayfasına yönlendir
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bir hata oluştu');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2>Kayıt Ol - SAP Yönetim</h2>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input type="text" name="name" placeholder="Ad Soyad" onChange={handleChange} required style={styles.input} />
                    <input type="email" name="email" placeholder="E-posta" onChange={handleChange} required style={styles.input} />
                    <input type="text" name="phone" placeholder="Telefon" onChange={handleChange} required style={styles.input} />
                    <input type="password" name="password" placeholder="Şifre" onChange={handleChange} required style={styles.input} />
                    <button type="submit" style={styles.button}>Kayıt Ol</button>
                </form>
                <p>Hesabın var mı? <Link to="/">Giriş Yap</Link></p>
            </div>
        </div>
    );
};

// Basit CSS (Hızlı görünüm için JS içinde yazdım)
const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' },
    card: { padding: '2rem', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', width: '350px', textAlign: 'center' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' },
    input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' },
    button: { padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }
};

export default Register;
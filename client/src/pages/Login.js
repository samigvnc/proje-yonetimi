// client/src/pages/Login.js
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../apiConfig';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/auth/login`, { email, password });
            
            // Token'ı ve kullanıcı bilgisini tarayıcı hafızasına kaydet
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));

            toast.success('Giriş Başarılı!');
            navigate('/dashboard'); // Panele yönlendir
        } catch (error) {
            toast.error(error.response?.data?.message || 'Giriş başarısız');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2>Giriş Yap</h2>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input type="email" placeholder="E-posta" onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
                    <input type="password" placeholder="Şifre" onChange={(e) => setPassword(e.target.value)} required style={styles.input} />
                    <button type="submit" style={styles.button}>Giriş Yap</button>
                </form>
                <p>Hesabın yok mu? <Link to="/register">Kayıt Ol</Link></p>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f8' },
    card: { padding: '2rem', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', width: '350px', textAlign: 'center' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' },
    input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' },
    button: { padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }
};

export default Login;
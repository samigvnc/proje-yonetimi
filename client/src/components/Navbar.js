// client/src/components/Navbar.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <nav style={styles.nav}>
            <div style={styles.brand} onClick={() => navigate('/dashboard')}>
                Işık IEEE Proje Yönetim Sistemi
            </div>
            <div style={styles.menu}>
                <span style={styles.user}>Merhaba, {user ? user.name : 'Kullanıcı'}</span>
                <button onClick={handleLogout} style={styles.logoutBtn}>Çıkış Yap</button>
            </div>
        </nav>
    );
};

const styles = {
    nav: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        backgroundColor: '#2c3e50',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    brand: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    menu: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
    },
    user: {
        fontSize: '1rem'
    },
    logoutBtn: {
        padding: '8px 15px',
        backgroundColor: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
    }
};

export default Navbar;
// client/src/components/Footer.js
import React from 'react';

const Footer = () => {
    return (
        <footer style={styles.footer}>
            <div style={styles.container}>
                
                {/* 1. Kısım: Proje Hakkında */}
                <div style={styles.column}>
                    <h3 style={styles.heading}>Işık IEEE Proje Yönetim Sistemi</h3>
                    <p style={styles.text}>
                        Teknofest takımları için geliştirilmiş, 
                        takım içi görev dağılımı ve süreç yönetim sistemi.
                    </p>
                    <p style={{...styles.text, marginTop:'10px', fontSize:'0.8rem', opacity:0.7}}>
                        &copy; 2025 Tüm Hakları Saklıdır.
                    </p>
                </div>

                {/* 2. Kısım: Hızlı Linkler */}
                <div style={styles.column}>
                    <h4 style={styles.subHeading}>Hızlı Erişim</h4>
                    <ul style={styles.list}>
                        <li><a href="/dashboard" style={styles.link}>Ana Sayfa</a></li>
                        <li><a href="#" style={styles.link}>Hakkımızda</a></li>
                        <li><a href="#" style={styles.link}>Teknofest Başvuru</a></li>
                        <li><a href="#" style={styles.link}>Yardım & Destek</a></li>
                    </ul>
                </div>

                {/* 3. Kısım: İletişim */}
                <div style={styles.column}>
                    <h4 style={styles.subHeading}>İletişim</h4>
                    <p style={styles.text}>📍 Teknoloji Fakültesi, B Blok</p>
                    <p style={styles.text}>📧 iletisim@rokettakimi.com</p>
                    <p style={styles.text}>📞 +90 555 123 45 67</p>
                    
                    {/* Sosyal Medya İkonları (Temsili) */}
                    <div style={{marginTop:'10px', display:'flex', gap:'10px'}}>
                        <span style={styles.socialIcon}>Instagram</span>
                        <span style={styles.socialIcon}>Twitter</span>
                        <span style={styles.socialIcon}>LinkedIn</span>
                    </div>
                </div>

            </div>
        </footer>
    );
};

// CSS Stilleri
const styles = {
    footer: {
        backgroundColor: '#2c3e50', // Navbar ile aynı ton
        color: '#ecf0f1',
        padding: '40px 0',
        marginTop: 'auto', // İçerik azsa bile en alta itmek için
        borderTop: '5px solid #e67e22' // Turuncu bir şerit şıklık katar
    },
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', // Mobilde alt alta, PC'de yan yana
        gap: '30px'
    },
    column: {
        display: 'flex',
        flexDirection: 'column'
    },
    heading: {
        margin: '0 0 15px 0',
        fontSize: '1.2rem',
        color: '#f1c40f' // Sarı başlık
    },
    subHeading: {
        margin: '0 0 15px 0',
        fontSize: '1.1rem',
        borderBottom: '1px solid #7f8c8d',
        paddingBottom: '5px',
        display: 'inline-block',
        width: 'fit-content'
    },
    text: {
        margin: '5px 0',
        fontSize: '0.9rem',
        color: '#bdc3c7',
        lineHeight: '1.5'
    },
    list: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    link: {
        color: '#bdc3c7',
        textDecoration: 'none',
        fontSize: '0.9rem',
        marginBottom: '8px',
        display: 'block',
        transition: 'color 0.3s'
    },
    socialIcon: {
        backgroundColor: '#34495e',
        padding: '5px 10px',
        borderRadius: '5px',
        fontSize: '0.8rem',
        cursor: 'pointer'
    }
};

export default Footer;
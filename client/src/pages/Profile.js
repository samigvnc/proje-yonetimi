// client/src/pages/Profile.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../apiConfig';
import Topbar from '../components/Navbar'; 

const Profile = () => {
  const [user, setUser] = useState({});
  const [myProjects, setMyProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);

  // Form verileri
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // --- YENİ STATE'LER (MODAL VE DÜZENLEME İÇİN) ---
  const [selectedProject, setSelectedProject] = useState(null); // Tıklanan proje
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Silme onayı
  const [editData, setEditData] = useState({ name: '', description: '' }); // Düzenleme verileri

  // LocalStorage'dan verileri al
  const storedUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token'); 
  const currentUserId = storedUser?.id || storedUser?._id;

  // Veri Çekme Fonksiyonu (Yenilemeler için dışarı aldık)
  const fetchData = async () => {
    try {
      const config = { headers: { 'auth-token': token } };
      
      // 1. Kullanıcı Bilgileri
      try {
          const userRes = await axios.get(`${API_URL}/users/${currentUserId}`, config);
          setUser(userRes.data);
          setEmail(userRes.data.email);
          setPhone(userRes.data.phone || ""); 
      } catch (uErr) {
          setUser(storedUser); 
          setEmail(storedUser.email);
      }

      // 2. Projeleri Çek ve Filtrele
      const projectsRes = await axios.get(`${API_URL}/projects`, config);
      
      const filteredProjects = projectsRes.data.filter(p => {
           const myId = String(currentUserId);
           const leaderId = p.leader && (p.leader._id || p.leader);
           const isLeader = String(leaderId) === myId;
           const isMember = p.members && p.members.some(m => {
               const memberId = m._id || m; 
               return String(memberId) === myId;
           });
           return isLeader || isMember;
      });
      setMyProjects(filteredProjects);

      // 3. Görevleri Çek (my-tasks yoksa manuel filtrele)
      try {
          const tasksRes = await axios.get(`${API_URL}/tasks/my-tasks`, config);
          setMyTasks(tasksRes.data);
      } catch (taskErr) {
          const allTasks = await axios.get(`${API_URL}/tasks`, config);
          const filteredTasks = allTasks.data.filter(t => {
              const myId = String(currentUserId);
              if (Array.isArray(t.assignedTo)) {
                  return t.assignedTo.some(id => String(id) === myId);
              } else {
                  return String(t.assignedTo) === myId;
              }
          });
          setMyTasks(filteredTasks);
      }
      setLoading(false);
    } catch (err) {
      console.error("Veri Hatası:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId && token) fetchData();
  }, [currentUserId, token]);

  // --- PROFİL GÜNCELLEME ---
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const updatedData = { email, phone };
      if (password) updatedData.password = password;

      await axios.put(`${API_URL}/users/${currentUserId}`, updatedData, {
        headers: { 'auth-token': token } 
      });
      setMsg({ text: "✅ Bilgiler güncellendi!", type: "success" });
      setPassword("");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg({ text: "❌ Güncelleme başarısız.", type: "error" });
    }
  };

  // --- PROJE İŞLEMLERİ ---

  // 1. Projeye Tıklayınca Modalı Aç
  const handleProjectClick = (project) => {
      setSelectedProject(project);
      setEditData({ name: project.name, description: project.description });
      setShowDeleteConfirm(false); // Önceki onay ekranı kaldıysa kapat
  };

  // 2. Proje Güncelle (Sadece Kaptan)
  const handleUpdateProject = async () => {
      try {
          await axios.put(`${API_URL}/projects/${selectedProject._id}`, editData, {
              headers: { 'auth-token': token }
          });
          setMsg({ text: "✅ Proje güncellendi.", type: "success" });
          setSelectedProject(null); // Modalı kapat
          fetchData(); // Listeyi yenile
          setTimeout(() => setMsg(""), 3000);
      } catch (error) {
          alert("Güncelleme başarısız.");
      }
  };

  // 3. Proje Sil (Sadece Kaptan)
  const handleDeleteProject = async () => {
      try {
          await axios.delete(`${API_URL}/projects/${selectedProject._id}`, {
              headers: { 'auth-token': token }
          });
          // Not: Backend'de delete methodu cascade yapılıysa görevler ve dosyalar da silinir.
          setMsg({ text: "🗑️ Proje ve dosyalar silindi.", type: "success" });
          setSelectedProject(null);
          fetchData();
          setTimeout(() => setMsg(""), 3000);
      } catch (error) {
          alert("Silme işlemi başarısız.");
      }
  };

  // 4. Projeden Ayrıl (Üye/Lider)
  const handleLeaveProject = async () => {
      if(!window.confirm("Projeden ayrılmak istediğinize emin misiniz?")) return;
      try {
          await axios.post(`${API_URL}/projects/leave`, 
              { projectId: selectedProject._id }, 
              { headers: { 'auth-token': token } }
          );
          setMsg({ text: "Projen ayrıldınız.", type: "success" });
          setSelectedProject(null);
          fetchData();
          setTimeout(() => setMsg(""), 3000);
      } catch (error) {
          alert("Ayrılma başarısız.");
      }
  };

  // 5. Görev Silme (Sağdaki Listeden)
  const handleDeleteTask = async (taskId) => {
      if(!window.confirm("Bu görevi silmek istediğinize emin misiniz?")) return;
      try {
          await axios.delete(`${API_URL}/tasks/${taskId}`, {
              headers: { 'auth-token': token }
          });
          setMsg({ text: "Görev silindi.", type: "success" });
          fetchData();
          setTimeout(() => setMsg(""), 3000);
      } catch (error) {
          alert("Silinemedi.");
      }
  };

  // --- YARDIMCI KONTROL ---
  const isCaptain = (proj) => {
      if (!proj) return false;
      const leaderId = proj.leader && (proj.leader._id || proj.leader);
      return String(leaderId) === String(currentUserId);
  };

  // --- STYLES ---
  const styles = {
    container: { maxWidth: "1100px", margin: "30px auto", padding: "0 20px", fontFamily: "'Segoe UI', sans-serif" },
    header: { marginBottom: "30px", borderBottom: "1px solid #e0e0e0", paddingBottom: "15px", color: "#2c3e50" },
    grid: { display: "flex", gap: "30px", flexWrap: "wrap", alignItems: "flex-start" },
    card: { 
        backgroundColor: "white", borderRadius: "12px", 
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "25px", 
        flex: 1, minWidth: "300px", border: "1px solid #f1f1f1" 
    },
    label: { display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "0.9rem" },
    input: { 
        width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", 
        border: "1px solid #ddd", fontSize: "1rem", backgroundColor: "#fff", boxSizing: "border-box" 
    },
    button: { 
        width: "100%", padding: "12px", backgroundColor: "#2ecc71", color: "white", 
        border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer" 
    },
    list: { listStyle: "none", padding: 0, margin: 0 },
    listItem: { 
        padding: "15px", borderBottom: "1px solid #eee", display: "flex", 
        justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "background 0.2s"
    },
    badge: (status) => ({
        backgroundColor: status === 'Tamamlandı' ? '#27ae60' : status === 'Devam Ediyor' ? '#f39c12' : '#e74c3c',
        color: 'white', padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600"
    }),
    // Modal Stilleri
    modalOverlay: {
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    },
    modalContent: {
        backgroundColor: 'white', padding: '25px', borderRadius: '15px', width: '450px',
        boxShadow: '0 5px 30px rgba(0,0,0,0.3)', position: 'relative'
    },
    dangerBtn: {
        padding: '10px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
    },
    secondaryBtn: {
        padding: '10px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px'
    }
  };

  if (loading) return <div style={{textAlign:"center", marginTop:"50px"}}>Yükleniyor...</div>;

  return (
    <>
      <Topbar />
      <div style={styles.container}>
        <h1 style={styles.header}>Profilim</h1>
        
        {/* BAŞARI/HATA MESAJI (ÜSTTE GÖRÜNSÜN) */}
        {msg && (
            <div style={{
                marginBottom: "20px", padding: "10px", borderRadius: "5px", 
                backgroundColor: msg.type === 'success' ? '#d4edda' : '#f8d7da',
                color: msg.type === 'success' ? '#155724' : '#721c24', textAlign: "center"
            }}>
                {msg.text}
            </div>
        )}

        <div style={styles.grid}>
          {/* SOL TARAF: HESAP AYARLARI */}
          <div style={styles.card}>
            <h2 style={{marginTop:0, color:"#34495e", borderBottom:"2px solid #2ecc71", display:"inline-block", paddingBottom:"5px"}}>
                Hesap Ayarları
            </h2>
            <form onSubmit={handleUpdate} autoComplete="off">
                <div>
                    <label style={styles.label}>E-Posta Adresi</label>
                    <input type="email" name="email_field_custom" value={email} onChange={e=>setEmail(e.target.value)} style={styles.input} autoComplete="off" />
                </div>
                <div>
                    <label style={styles.label}>Telefon Numarası</label>
                    <input type="text" name="phone_field_custom" value={phone} onChange={e=>setPhone(e.target.value)} style={styles.input} placeholder="+90 555 ..." autoComplete="new-password"/>
                </div>
                <div>
                    <label style={styles.label}>Yeni Şifre (İsteğe Bağlı)</label>
                    <input type="password" name="new_password_field" value={password} onChange={e=>setPassword(e.target.value)} style={styles.input} placeholder="********" autoComplete="new-password"/>
                </div>
                <button type="submit" style={styles.button}>Güncelle</button>
            </form>
          </div>

          {/* SAĞ TARAF: PROJELER & GÖREVLER */}
          <div style={{flex: 1, display:"flex", flexDirection:"column", gap:"30px"}}>
            
            {/* PROJELERİM */}
            <div style={styles.card}>
                <h3 style={{marginTop:0, color:"#2980b9"}}>📂 Dahil Olduğum Projeler</h3>
                <p style={{fontSize:'0.8rem', color:'#888', marginBottom:'10px'}}>Detaylar ve ayarlar için projeye tıklayın.</p>
                {myProjects.length === 0 ? (
                    <p style={{color:"#95a5a6"}}>Henüz aktif bir projeniz yok.</p>
                ) : (
                    <ul style={styles.list}>
                        {myProjects.map(p => (
                            <li 
                                key={p._id} 
                                style={styles.listItem}
                                onClick={() => handleProjectClick(p)} // Tıklayınca Modal Aç
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div>
                                    <strong style={{fontSize:"1.1rem", display:"block", color: isCaptain(p) ? '#e67e22' : '#2c3e50'}}>
                                        {p.name || p.title} {isCaptain(p) && "👑"}
                                    </strong>
                                    {p.joinCode && <span style={{fontSize:"0.8rem", color:"#7f8c8d"}}>Kod: {p.joinCode}</span>}
                                </div>
                                <span style={{fontSize:"1.2rem"}}>⚙️</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* GÖREVLERİM */}
            <div style={styles.card}>
                <h3 style={{marginTop:0, color:"#e67e22"}}>📋 Üzerimdeki Görevler</h3>
                {myTasks.length === 0 ? (
                    <p style={{color:"#95a5a6"}}>Şu an üzerinizde bekleyen görev yok.</p>
                ) : (
                    <ul style={styles.list}>
                        {myTasks.map(t => (
                            <li key={t._id} style={{...styles.listItem, cursor:'default'}}>
                                <div>
                                    <span style={{fontWeight:'bold'}}>{t.title}</span> <br/>
                                    <span style={styles.badge(t.status)}>{t.status}</span>
                                </div>
                                {/* Görev Silme Butonu */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(t._id); }} 
                                    style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem'}}
                                    title="Görevi Sil"
                                >
                                    🗑️
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* --- PROJE DETAY & DÜZENLEME MODALI --- */}
      {selectedProject && (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                {/* Modal Header */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #eee', paddingBottom:'10px', marginBottom:'15px'}}>
                    <h3 style={{margin:0, color:'#2c3e50'}}>
                        {isCaptain(selectedProject) ? 'Proje Yönetimi' : 'Proje Detayı'}
                    </h3>
                    <button onClick={() => setSelectedProject(null)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer'}}>✖</button>
                </div>

                {/* Modal Body */}
                {!showDeleteConfirm ? (
                    <>
                        <div style={{marginBottom:'15px'}}>
                            <label style={styles.label}>Proje Adı:</label>
                            {isCaptain(selectedProject) ? (
                                <input 
                                    type="text" 
                                    value={editData.name} 
                                    onChange={(e) => setEditData({...editData, name: e.target.value})} 
                                    style={styles.input} 
                                />
                            ) : (
                                <p style={{padding:'10px', backgroundColor:'#f9f9f9', borderRadius:'5px'}}>{selectedProject.name}</p>
                            )}
                        </div>

                        <div style={{marginBottom:'20px'}}>
                            <label style={styles.label}>Açıklama:</label>
                            {isCaptain(selectedProject) ? (
                                <textarea 
                                    value={editData.description} 
                                    onChange={(e) => setEditData({...editData, description: e.target.value})} 
                                    style={{...styles.input, height:'80px'}} 
                                />
                            ) : (
                                <p style={{padding:'10px', backgroundColor:'#f9f9f9', borderRadius:'5px'}}>{selectedProject.description}</p>
                            )}
                        </div>

                        {/* Butonlar */}
                        <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                            {isCaptain(selectedProject) ? (
                                <>
                                    <button onClick={() => setShowDeleteConfirm(true)} style={styles.dangerBtn}>Projeyi Sil</button>
                                    <button onClick={handleUpdateProject} style={styles.button}>Kaydet</button>
                                </>
                            ) : (
                                <button onClick={handleLeaveProject} style={styles.dangerBtn}>Projeden Ayrıl</button>
                            )}
                        </div>
                    </>
                ) : (
                    // SİLME ONAY EKRANI
                    <div style={{textAlign:'center', padding:'20px 0'}}>
                        <div style={{fontSize:'3rem', marginBottom:'10px'}}>⚠️</div>
                        <h4 style={{color:'#c0392b', marginTop:0}}>Projeyi Silmek Üzeresiniz!</h4>
                        <p style={{color:'#666', fontSize:'0.9rem', marginBottom:'20px'}}>
                            Bu işlem geri alınamaz. Projeye ait <strong>tüm dosyalar, görevler ve mesajlar</strong> kalıcı olarak silinecektir.
                        </p>
                        <div style={{display:'flex', justifyContent:'center', gap:'10px'}}>
                            <button onClick={() => setShowDeleteConfirm(false)} style={styles.secondaryBtn}>İptal</button>
                            <button onClick={handleDeleteProject} style={styles.dangerBtn}>Evet, Hepsini Sil</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

    </>
  );
};

export default Profile;
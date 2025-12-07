// client/src/pages/ProjectDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

const ProjectDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // UI Kontrol
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [editingLeaderTeam, setEditingLeaderTeam] = useState(null);
    
    // GÖREV ARŞİVİ STATE'LERİ
    const [showAllTasksModal, setShowAllTasksModal] = useState(false); 
    const [projectTasks, setProjectTasks] = useState([]); 
    const [taskTab, setTaskTab] = useState('active'); 

    // Form Data
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedLeader, setSelectedLeader] = useState({});

    // Görev Oluşturma
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskData, setTaskData] = useState({ title: '', description: '', deadline: '', targetTeam: '' });
    const [taskImage, setTaskImage] = useState(null);
    
    // Duyuru
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [showAnnounceForm, setShowAnnounceForm] = useState(false);

    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user'));

    // --- VERİ ÇEKME ---
    const fetchProject = async () => {
        try {
            const res = await axios.get(`https://proje-yonetimi.onrender.com/api/projects/${id}`, {
                headers: { 'auth-token': token }
            });
            setProject(res.data);
            setLoading(false);
        } catch (error) {
            toast.error("Hata");
            navigate('/dashboard');
        }
    };

    // PROJENİN TÜM GÖREVLERİNİ ÇEK
    const fetchProjectTasks = async () => {
        try {
            const res = await axios.get(`https://proje-yonetimi.onrender.com/api/tasks/project/${id}`, {
                headers: { 'auth-token': token }
            });
            setProjectTasks(res.data);
            setShowAllTasksModal(true); 
        } catch (error) {
            toast.error("Görevler alınamadı.");
        }
    };

    useEffect(() => { fetchProject(); }, [id]);

    // --- İŞLEMLER ---
    const handleCreateTeam = async () => {
        if(!newTeamName.trim()) return;
        try {
            await axios.post(`https://proje-yonetimi.onrender.com/api/projects/${id}/subteams`, { name: newTeamName }, { headers: { 'auth-token': token } });
            toast.success('Ekip oluşturuldu'); setNewTeamName(''); setShowTeamForm(false); fetchProject();
        } catch (error) { toast.error('Hata'); }
    };

    const handleAssignLeader = async (teamName) => {
        const leaderId = selectedLeader[teamName];
        if (!leaderId) return toast.warning("Üye seçin");
        try {
            await axios.put(`https://proje-yonetimi.onrender.com/api/projects/${id}/assign-leader`, { subTeamName: teamName, newLeaderId: leaderId }, { headers: { 'auth-token': token } });
            toast.success(`${teamName} lideri güncellendi`); setEditingLeaderTeam(null); fetchProject();
        } catch (error) { toast.error('Hata'); }
    };

    const handleRemoveMember = async (memberId) => {
        if(!window.confirm("Emin misiniz?")) return;
        try {
            await axios.delete(`https://proje-yonetimi.onrender.com/api/projects/${id}/members/${memberId}`, { headers: { 'auth-token': token } });
            toast.success("Üye çıkarıldı."); fetchProject();
        } catch (error) { toast.error("Hata"); }
    };

    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`https://proje-yonetimi.onrender.com/api/projects/${id}/announcements`, { title: announcementTitle, content: announcementContent }, { headers: { 'auth-token': token } });
            toast.success('Yayınlandı!'); setAnnouncementTitle(''); setAnnouncementContent(''); setShowAnnounceForm(false); fetchProject();
        } catch (error) { toast.error('Hata'); }
    };

    // TEK DUYURU SİLME FONKSİYONU
    const handleDeleteAnnouncement = async (annId) => {
        if(!window.confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) return;
        try {
            await axios.delete(`https://proje-yonetimi.onrender.com/api/projects/${id}/announcements/${annId}`, { 
                headers: { 'auth-token': token } 
            });
            toast.success('Duyuru silindi.'); 
            fetchProject(); // Listeyi yenile
        } catch (error) { 
            toast.error(error.response?.data?.message || 'Hata'); 
        }
    };

    // TÜM DUYURULARI TEMİZLE
    const handleClearAnnouncements = async () => {
        if(!window.confirm("Tüm pano temizlenecek. Emin misiniz?")) return;
        try {
            await axios.delete(`https://proje-yonetimi.onrender.com/api/projects/${id}/announcements`, { headers: { 'auth-token': token } });
            toast.success('Pano temizlendi.'); fetchProject();
        } catch (error) { toast.error('Hata'); }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('projectId', id);
        formData.append('title', taskData.title);
        formData.append('description', taskData.description);
        formData.append('deadline', taskData.deadline);
        formData.append('targetSubTeamName', taskData.targetTeam);
        if (taskImage) formData.append('file', taskImage);

        try {
            await axios.post('https://proje-yonetimi.onrender.com/api/tasks/create', formData, { headers: { 'auth-token': token, 'Content-Type': 'multipart/form-data' } });
            toast.success('Görev iletildi!'); setShowTaskModal(false); setTaskData({ title: '', description: '', deadline: '', targetTeam: '' }); setTaskImage(null);
        } catch (error) { toast.error('Hata'); }
    };

    // YENİ: KAPTAN ONAY/REVİZYON FONKSİYONU
    const handleCaptainResolve = async (taskId, decision) => {
        try {
            await axios.put('https://proje-yonetimi.onrender.com/api/tasks/captain-resolve', 
                { taskId, decision }, 
                { headers: { 'auth-token': token } }
            );
            toast.success(decision === 'approve' ? "Görev onaylandı ve arşivlendi." : "Görev revizyona gönderildi.");
            fetchProjectTasks(); // Listeyi anlık güncelle
        } catch (error) { toast.error('Hata'); }
    };

    // Dosya Linki
    const renderFileLink = (filePath, originalName) => {
    if (!filePath) return null;

    // Cloudinary mi Local mi kontrolü
    const url = filePath.startsWith('http') ? filePath : `https://proje-yonetimi.onrender.com/${filePath}`;

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" 
           style={{display:'inline-block', marginTop:'5px', color:'#3498db', textDecoration:'none', fontWeight:'bold', fontSize:'0.9rem'}}>
           📎 Dosyayı İndir ({originalName || 'Dosya'})
        </a>
    );
};

    const getMemberTeamName = (memberId) => {
        if (!project.subTeams) return null;
        const team = project.subTeams.find(t => t.members.some(m => m._id === memberId));
        return team ? team.name : "Ana Ekip";
    };

    if (loading) return <div>Yükleniyor...</div>;

    const isCaptain = project.leader._id === currentUser.id;
    const isTeamLeader = project.subTeams.some(t => t.leader && t.leader._id === currentUser.id);
    const canAnnounce = isCaptain || isTeamLeader;

    const activeTasks = projectTasks.filter(t => t.status !== 'Tamamlandi');
    const completedTasks = projectTasks.filter(t => t.status === 'Tamamlandi');

    return (
        <div style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', paddingBottom: '50px' }}>
            <Navbar />
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                
                {/* BAŞLIK */}
                <div style={styles.headerCard}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                        <div>
                            <h1 style={{margin:'0 0 10px 0'}}>{project.name}</h1>
                            <p style={{ color: '#666', margin:0 }}>{project.description}</p>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', alignItems:'end', gap:'10px'}}>
                            <div style={styles.codeBox}>🔑 Kod: <strong>{project.joinCode}</strong></div>
                            {/* ARŞİV BUTONU */}
                            <button onClick={fetchProjectTasks} style={styles.archiveBtn}>📂 Görevler & Arşiv</button>
                        </div>
                    </div>
                </div>

                {/* DUYURU */}
                <div style={styles.announceSection}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                        <h2 style={{margin:0, color:'#2c3e50', fontSize:'1.2rem'}}>📢 Duyuru Panosu</h2>
                        <div style={{display:'flex', gap:'10px'}}>
                            {/* TEMİZLE BUTONU (YENİ) */}
                            {isCaptain && project.announcements.length > 0 && (
                                <button onClick={handleClearAnnouncements} style={{...styles.announceBtn, backgroundColor:'#e74c3c'}}>
                                    🗑️ Temizle
                                </button>
                            )}
                            
                            {/* MEVCUT YENİ DUYURU BUTONU */}
                            {canAnnounce && (
                                <button onClick={() => setShowAnnounceForm(!showAnnounceForm)} style={styles.announceBtn}>
                                    {showAnnounceForm ? 'Kapat' : '+ Yeni Duyuru'}
                                </button>
                            )}
                        </div>
                    </div>
                    {showAnnounceForm && (
                        <div style={styles.announceForm}>
                            <form onSubmit={handlePostAnnouncement}>
                                <input type="text" placeholder="Başlık" value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} required style={styles.input} />
                                <textarea placeholder="İçerik..." value={announcementContent} onChange={e => setAnnouncementContent(e.target.value)} required style={{...styles.input, height:'60px', marginTop:'10px'}} />
                                <button type="submit" style={{...styles.saveBtn, marginTop:'10px'}}>Yayınla</button>
                            </form>
                        </div>
                    )}
                    <div style={styles.announceList}>
                        {project.announcements && project.announcements.length > 0 ? (
                            project.announcements.slice().reverse().map((ann, index) => (
                                <div key={index} style={styles.announceCard}>
                                    
                                    {/* --- BAŞLIK VE SİLME BUTONU YAN YANA --- */}
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                        <h4 style={{margin:'0 0 5px 0', color:'#e67e22'}}>{ann.title}</h4>
                                        
                                        {/* SİLME BUTONU (Sadece Kaptan veya Yazan Kişi Görebilir) */}
                                        {(isCaptain || ann.author === currentUser.id) && (
                                            <button 
                                                onClick={() => handleDeleteAnnouncement(ann._id)}
                                                style={{
                                                    background:'none', 
                                                    border:'none', 
                                                    cursor:'pointer', 
                                                    color:'#999', 
                                                    fontSize:'1.1rem',
                                                    padding: '0 5px'
                                                }}
                                                title="Bu duyuruyu sil"
                                            >
                                                ✖
                                            </button>
                                        )}
                                    </div>
                                    {/* ------------------------------------------- */}

                                    <p style={{margin:0, fontSize:'0.9rem'}}>{ann.content}</p>
                                    <div style={styles.announceMeta}>
                                        <span>✍️ {ann.authorName}</span>
                                        <span>🕒 {new Date(ann.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{color:'#999', fontSize:'0.9rem'}}>Henüz duyuru yok.</p>
                        )}
                    </div>
                </div>

                {/* İÇERİK */}
                <div style={styles.contentGrid}>
                    {/* SOL: ÜYELER */}
                    <div style={styles.card}>
                        <h3 style={{ borderBottom: '2px solid #3498db', paddingBottom: '10px', marginTop:0 }}>👥 Takım Üyeleri</h3>
                        <ul style={styles.list}>
                            {project.members.map(member => (
                                <li key={member._id} style={styles.listItem}>
                                    <div><strong>{member.name}</strong> <span style={{fontSize:'0.8rem', color:'#7f8c8d'}}>{project.leader._id === member._id ? '👑 Kaptan' : `📍 ${getMemberTeamName(member._id)}`}</span></div>
                                    {isCaptain && project.leader._id !== member._id && <button onClick={() => handleRemoveMember(member._id)} style={styles.deleteBtn}>❌</button>}
                                </li>
                            ))}
                        </ul>
                        {/* EKİP EKLEME BUTONU */}
                        {isCaptain && (
                            <div style={{marginTop:'20px', borderTop:'1px solid #eee', paddingTop:'15px'}}>
                                {!showTeamForm ? (
                                    <button onClick={() => setShowTeamForm(true)} style={{...styles.addBtn, width:'100%', backgroundColor:'#95a5a6'}}>+ Yeni Alt Ekip Oluştur</button>
                                ) : (
                                    <div style={styles.createBox}>
                                        <input type="text" placeholder="Ekip Adı" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} style={styles.input} />
                                        <div style={{display:'flex', gap:'5px', marginTop:'5px'}}><button onClick={handleCreateTeam} style={styles.addBtn}>Kaydet</button><button onClick={() => setShowTeamForm(false)} style={{...styles.addBtn, backgroundColor:'#e74c3c'}}>İptal</button></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* SAĞ: GÖREVLER & EKİPLER */}
                    <div style={styles.card}>
                        {isCaptain && (
                            <div style={{ marginBottom: '20px', paddingBottom:'15px', borderBottom:'1px solid #eee' }}>
                                <button onClick={() => setShowTaskModal(true)} style={{...styles.announceBtn, width:'100%', display:'block', fontSize:'1.1rem', padding:'12px'}}>📝 Takımlara Görev Ver</button>
                            </div>
                        )}
                        <h3 style={{ borderBottom: '2px solid #e67e22', paddingBottom: '10px', marginTop:0 }}>🛠 Ekipler</h3>
                        <div style={styles.teamsList}>
                            {project.subTeams.map((team, index) => (
                                <div key={index} style={styles.teamCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems:'center' }}><h4 style={{ margin: 0 }}>{team.name}</h4><span style={{ fontSize: '0.8rem', backgroundColor: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{team.members.length} Üye</span></div>
                                    <div style={{ marginTop: '5px', fontSize: '0.9rem', marginBottom:'10px' }}>Lider: {team.leader ? <span style={{ color: '#27ae60', fontWeight: 'bold' }}>{team.leader.name}</span> : <span style={{ color: '#e74c3c' }}>Atanmadı</span>}</div>
                                    {isCaptain && (
                                        <div>
                                            {editingLeaderTeam !== team.name ? (
                                                <button onClick={() => setEditingLeaderTeam(team.name)} style={{fontSize:'0.8rem', cursor:'pointer', background:'none', border:'none', color:'#3498db', padding:0}}>⚙️ Lider İşlemleri</button>
                                            ) : (
                                                <div style={{backgroundColor:'#f9f9f9', padding:'10px', borderRadius:'5px', marginTop:'5px'}}>
                                                    <select style={{...styles.select, marginBottom:'5px'}} onChange={(e) => setSelectedLeader({...selectedLeader, [team.name]: e.target.value})}><option value="">Yeni Lider Seç...</option>{project.members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select>
                                                    <div style={{display:'flex', gap:'5px'}}><button onClick={() => handleAssignLeader(team.name)} style={{...styles.assignBtn, fontSize:'0.8rem'}}>Ata</button><button onClick={() => setEditingLeaderTeam(null)} style={{...styles.assignBtn, backgroundColor:'#e74c3c', fontSize:'0.8rem'}}>Kapat</button></div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {project.subTeams.length === 0 && <p style={{ color: '#999' }}>Henüz ekip yok.</p>}
                        </div>
                    </div>
                </div>

                {/* --- MODALLAR --- */}
                
                {/* 1. GÖREV OLUŞTURMA MODALI */}
                {showTaskModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <h3>Yeni Görev Oluştur</h3>
                            <form onSubmit={handleCreateTask} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                                <input type="text" placeholder="Görev Başlığı" required style={styles.input} onChange={e => setTaskData({...taskData, title: e.target.value})} />
                                <textarea placeholder="Açıklama" required style={{...styles.input, height:'80px'}} onChange={e => setTaskData({...taskData, description: e.target.value})} />
                                <label style={{fontSize:'0.9rem', fontWeight:'bold'}}>Son Tarih:</label>
                                <input type="date" required style={styles.input} onChange={e => setTaskData({...taskData, deadline: e.target.value})} />
                                <select required style={styles.select} onChange={e => setTaskData({...taskData, targetTeam: e.target.value})}><option value="">Hangi Ekibe?</option>{project.subTeams.map((t, i) => <option key={i} value={t.name}>{t.name}</option>)}</select>
                                <label style={{fontSize:'0.9rem', fontWeight:'bold'}}>Dosya:</label>
                                <input type="file" onChange={e => setTaskImage(e.target.files[0])} />
                                <div style={{display:'flex', gap:'10px', marginTop:'10px'}}><button type="submit" style={styles.addBtn}>Gönder</button><button type="button" onClick={() => setShowTaskModal(false)} style={{...styles.saveBtn, backgroundColor:'#e74c3c'}}>İptal</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 2. GÖREVLER & ARŞİV MODALI (BURASI GÜNCELLENDİ) */}
                {showAllTasksModal && (
                    <div style={styles.modalOverlay}>
                        <div style={{...styles.modalContent, width:'700px', maxHeight:'80vh', overflowY:'auto'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                                <h2 style={{margin:0}}>📂 Görev Paneli</h2>
                                <button onClick={() => setShowAllTasksModal(false)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer'}}>✖</button>
                            </div>

                            <div style={{display:'flex', borderBottom:'1px solid #eee', marginBottom:'15px'}}>
                                <button onClick={() => setTaskTab('active')} style={{...styles.tabBtn, borderBottom: taskTab === 'active' ? '3px solid #3498db' : 'none', color: taskTab === 'active' ? '#3498db' : '#888'}}>🔥 Aktif / Bekleyen</button>
                                <button onClick={() => setTaskTab('completed')} style={{...styles.tabBtn, borderBottom: taskTab === 'completed' ? '3px solid #27ae60' : 'none', color: taskTab === 'completed' ? '#27ae60' : '#888'}}>✅ Tamamlananlar</button>
                            </div>

                            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                                {(taskTab === 'active' ? activeTasks : completedTasks).map(task => (
                                    <div key={task._id} style={{padding:'15px', border:'1px solid #eee', borderRadius:'8px', backgroundColor: task.status === 'KaptanOnayinda' ? '#ebf5fb' : '#fff', borderLeft: task.status === 'KaptanOnayinda' ? '5px solid #2980b9' : '1px solid #eee'}}>
                                        
                                        <div style={{display:'flex', justifyContent:'space-between'}}>
                                            <h4 style={{margin:0}}>{task.title} <span style={{fontSize:'0.8rem', fontWeight:'normal', color:'#666'}}>({task.targetSubTeam})</span></h4>
                                            <span style={{fontSize:'0.8rem', fontWeight:'bold', color: task.status==='KaptanOnayinda' ? '#2980b9' : '#888'}}>
                                                {task.status === 'KaptanOnayinda' ? 'ONAY BEKLİYOR' : task.status}
                                            </span>
                                        </div>
                                        
                                        <p style={{fontSize:'0.9rem', color:'#666', margin:'5px 0'}}>{task.description}</p>
                                        
                                        {/* KAPTAN DOSYASI */}
                                        {renderFileLink(task.file, task.originalFileName)}

                                        {/* --- YENİ EKLENEN KISIM: ÜYELERİN YÜKLEDİKLERİ --- */}
                                        {task.assignedMembers && task.assignedMembers.some(m => m.isCompleted) && (
                                            <div style={{marginTop:'10px', backgroundColor:'#fff', padding:'10px', borderRadius:'5px', border:'1px solid #eee'}}>
                                                <strong style={{fontSize:'0.85rem', color:'#34495e'}}>📤 Teslim Edilen Çalışmalar:</strong>
                                                {task.assignedMembers.map((m, mIdx) => (
                                                    <div key={mIdx} style={{marginTop:'5px', paddingBottom:'5px', borderBottom: mIdx !== task.assignedMembers.length -1 ? '1px dashed #ddd' : 'none'}}>
                                                        <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem'}}>
                                                            <span style={{fontWeight:'bold'}}>{m.member.name}</span>
                                                            <span style={{color: m.isCompleted ? '#27ae60' : '#e74c3c'}}>
                                                                {m.isCompleted ? '✅ Teslim Etti' : '⏳ Bekleniyor'}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* NOTU GÖSTER */}
                                                        {m.completionNote && (
                                                            <div style={{fontSize:'0.85rem', color:'#555', fontStyle:'italic', marginTop:'2px'}}>
                                                                " {m.completionNote} "
                                                            </div>
                                                        )}

                                                        {/* DOSYAYI GÖSTER */}
                                                        {m.completionFile && renderFileLink(m.completionFile, m.originalCompletionFileName)}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* --- YENİ EKLENEN KISIM: KAPTAN AKSİYON BUTONLARI --- */}
                                        {isCaptain && task.status === 'KaptanOnayinda' && (
                                            <div style={{marginTop:'15px', display:'flex', gap:'10px', justifyContent:'flex-end', borderTop:'1px solid #eee', paddingTop:'10px'}}>
                                                <button onClick={() => handleCaptainResolve(task._id, 'revision')} style={{...styles.saveBtn, backgroundColor:'#e74c3c'}}>↩ Revizyon İste</button>
                                                <button onClick={() => handleCaptainResolve(task._id, 'approve')} style={{...styles.saveBtn, backgroundColor:'#27ae60'}}>✅ Onayla ve Kapat</button>
                                            </div>
                                        )}

                                    </div>
                                ))}
                                {(taskTab === 'active' ? activeTasks : completedTasks).length === 0 && <p style={{color:'#999'}}>Görev yok.</p>}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

const styles = {
    headerCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    codeBox: { padding: '8px 12px', backgroundColor: '#e8f6f3', color: '#16a085', borderRadius: '8px', border: '1px solid #d1f2eb', fontSize:'0.9rem', marginBottom:'5px' },
    archiveBtn: { padding: '8px 15px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },

    announceSection: { backgroundColor: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #e67e22' },
    announceBtn: { backgroundColor: '#e67e22', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    announceForm: { backgroundColor: '#fdf2e9', padding: '10px', borderRadius: '8px', marginBottom: '15px' },
    announceList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight:'200px', overflowY:'auto' },
    announceCard: { backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '6px', border: '1px solid #eee' },
    announceMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888', marginTop: '5px' },

    contentGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', alignSelf: 'start' },
    
    list: { listStyle: 'none', padding: 0, margin: 0 },
    listItem: { padding: '10px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    captainBadge: { backgroundColor: '#f1c40f', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', color: '#fff' },
    deleteBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.5 },
    
    createBox: { display: 'flex', flexDirection:'column', gap: '5px', marginTop: '10px' },
    input: { padding: '8px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '0.9rem', width:'100%', boxSizing:'border-box' },
    addBtn: { padding: '8px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', flex:1 },
    saveBtn: { padding: '8px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    
    teamsList: { display: 'flex', flexDirection: 'column', gap: '15px' },
    teamCard: { border: '1px solid #eee', padding: '15px', borderRadius: '8px', backgroundColor: '#fafafa' },
    select: { padding: '5px', borderRadius: '5px', border: '1px solid #ccc', width:'100%' },
    assignBtn: { padding: '5px 10px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },

    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '400px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' },
    tabBtn: { flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize:'1rem' }
};

export default ProjectDetails;
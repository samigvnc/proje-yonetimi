import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import { API_URL } from '../apiConfig';
import Select from 'react-select'; 

const ProjectDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // UI Kontrol
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [editingLeaderTeam, setEditingLeaderTeam] = useState(null);
    const [showAllTasksModal, setShowAllTasksModal] = useState(false); 
    const [projectTasks, setProjectTasks] = useState([]); 
    const [taskTab, setTaskTab] = useState('active'); 

    // REVİZYON MODAL STATE'LERİ
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionData, setRevisionData] = useState({ taskId: null, type: null }); // type: 'leader' veya 'captain'
    const [revisionNote, setRevisionNote] = useState("");
    const [revisionDeadline, setRevisionDeadline] = useState("");

    // Form Data
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedLeader, setSelectedLeader] = useState({});

    // Görev Oluşturma
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskData, setTaskData] = useState({ title: '', description: '', deadline: '', targetTeam: '', selectedMembers: [] });
    const [taskImage, setTaskImage] = useState(null);
    
    // DELEGATE MODAL STATE
    const [delegateModal, setDelegateModal] = useState({ show: false, taskId: null, projectMembers: [] });
    const [assignments, setAssignments] = useState([{ memberId: '', note: '' }]);

    // Duyuru
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [showAnnounceForm, setShowAnnounceForm] = useState(false);

    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
    const currentUserId = currentUser.id || currentUser._id;

    const fetchProject = async () => {
        try {
            const res = await axios.get(`${API_URL}/projects/${id}`, { headers: { 'auth-token': token } });
            setProject(res.data);
            setLoading(false);
        } catch (error) {
            toast.error("Hata");
            navigate('/dashboard');
        }
    };

    const fetchProjectTasks = async () => {
        try {
            const res = await axios.get(`${API_URL}/tasks/project/${id}`, { headers: { 'auth-token': token } });
            setProjectTasks(res.data);
            setShowAllTasksModal(true); 
        } catch (error) { toast.error("Görevler alınamadı."); }
    };

    useEffect(() => { fetchProject(); }, [id]);

    const handleCreateTeam = async () => {
        if(!newTeamName.trim()) return;
        try {
            await axios.post(`${API_URL}/projects/${id}/subteams`, { name: newTeamName }, { headers: { 'auth-token': token } });
            toast.success('Ekip oluşturuldu'); setNewTeamName(''); setShowTeamForm(false); fetchProject();
        } catch (error) { toast.error('Hata'); }
    };

    // --- GÖREV DAĞITIM (DELEGATE) FONKSİYONLARI ---
    
    // Modalı Aç
    const openDelegateModal = (taskId, targetSubTeamName) => {
        // Hedef ekibin üyelerini bul
        const targetTeam = project.subTeams.find(t => t.name === targetSubTeamName);
        const members = targetTeam ? targetTeam.members : [];
        
        setDelegateModal({ show: true, taskId, projectMembers: members });
        setAssignments([{ memberId: '', note: '' }]); 
    };

    // Dinamik Satır Ekle/Çıkar
    const handleAssignmentChange = (index, field, value) => {
        const newAssignments = [...assignments];
        newAssignments[index][field] = value;
        setAssignments(newAssignments);
    };
    const addAssignmentRow = () => { setAssignments([...assignments, { memberId: '', note: '' }]); };
    const removeAssignmentRow = (index) => {
        const newAssignments = assignments.filter((_, i) => i !== index);
        setAssignments(newAssignments);
    };

    // Görevi Dağıt (API İsteği)
    const handleDelegateTask = async () => {
        const validAssignments = assignments.filter(a => a.memberId !== '');
        if (validAssignments.length === 0) return toast.warning("En az bir kişi seçmelisiniz.");
        
        try {
            await axios.put(`${API_URL}/tasks/delegate`, 
                { taskId: delegateModal.taskId, assignments: validAssignments }, 
                { headers: { 'auth-token': token } }
            );
            toast.success("Görev ekibe dağıtıldı.");
            setDelegateModal({ show: false, taskId: null, projectMembers: [] });
            fetchProjectTasks();
        } catch (error) { toast.error('Hata'); }
    };

    const handleAssignLeader = async (teamName) => {
        const leaderId = selectedLeader[teamName];
        if (!leaderId) return toast.warning("Üye seçin");
        try {
            await axios.put(`${API_URL}/projects/${id}/assign-leader`, { subTeamName: teamName, newLeaderId: leaderId }, { headers: { 'auth-token': token } });
            toast.success(`${teamName} lideri güncellendi`); setEditingLeaderTeam(null); fetchProject();
        } catch (error) { toast.error('Hata'); }
    };

    const handleRemoveMember = async (memberId) => {
        if(!window.confirm("Emin misiniz?")) return;
        try {
            await axios.delete(`${API_URL}/projects/${id}/members/${memberId}`, { headers: { 'auth-token': token } });
            toast.success("Üye çıkarıldı."); fetchProject();
        } catch (error) { toast.error("Hata"); }
    };

    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/projects/${id}/announcements`, { title: announcementTitle, content: announcementContent }, { headers: { 'auth-token': token } });
            toast.success('Yayınlandı!'); setAnnouncementTitle(''); setAnnouncementContent(''); setShowAnnounceForm(false); fetchProject();
        } catch (error) { toast.error('Hata'); }
    };

    const handleDeleteAnnouncement = async (annId) => {
        if(!window.confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) return;
        try {
            await axios.delete(`${API_URL}/projects/${id}/announcements/${annId}`, { headers: { 'auth-token': token } });
            toast.success('Duyuru silindi.'); fetchProject();
        } catch (error) { toast.error('Hata'); }
    };

    const handleClearAnnouncements = async () => {
        if(!window.confirm("Tüm pano temizlenecek. Emin misiniz?")) return;
        try {
            await axios.delete(`${API_URL}/projects/${id}/announcements`, { headers: { 'auth-token': token } });
            toast.success('Pano temizlendi.'); fetchProject();
        } catch (error) { toast.error('Hata'); }
    };

    // --- GÖREV OLUŞTURMA (Düzeltildi) ---
    const handleCreateTask = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('projectId', id);
        formData.append('title', taskData.title);
        formData.append('description', taskData.description);
        formData.append('deadline', taskData.deadline);
        
        if (taskData.targetTeam) {
            formData.append('targetSubTeamName', taskData.targetTeam);
        }
        
        if (taskData.selectedMembers && taskData.selectedMembers.length > 0) {
            taskData.selectedMembers.forEach(option => {
                formData.append('assignedTo', option.value); 
            });
        }
        
        if (taskImage) formData.append('file', taskImage);

        try {
            await axios.post(`${API_URL}/tasks/create`, formData, { headers: { 'auth-token': token, 'Content-Type': 'multipart/form-data' } });
            toast.success('Görev iletildi!'); 
            setShowTaskModal(false); 
            setTaskData({ title: '', description: '', deadline: '', targetTeam: '', selectedMembers: [] }); 
            setTaskImage(null);
        } catch (error) { 
            console.error(error);
            toast.error(error.response?.data?.message || 'Hata oluştu'); 
        }
    };

    // --- ONAY VE REVİZYON FONKSİYONLARI ---
    
    // 1. Modalı Açan Fonksiyon (Revizyon butonuna basınca çalışır)
    const openRevisionModal = (taskId, type) => {
        setRevisionData({ taskId, type });
        setRevisionNote("");
        setRevisionDeadline("");
        setShowRevisionModal(true);
    };

    // 2. Onaylama Fonksiyonu (Onayla butonuna basınca direkt çalışır)
    const handleApproveDirect = async (taskId, type) => {
        const endpoint = type === 'leader' ? 'leader-resolve' : 'captain-resolve';
        try {
            await axios.put(`${API_URL}/tasks/${endpoint}`, 
                { taskId, decision: 'approve' }, 
                { headers: { 'auth-token': token } }
            );
            toast.success("Görev onaylandı!");
            fetchProjectTasks();
        } catch (error) {
            toast.error("İşlem başarısız.");
        }
    };

    // 3. Revizyonu Gönderen Fonksiyon (Modal içindeki 'Gönder' butonu)
    const submitRevision = async (e) => {
        e.preventDefault();
        if (!revisionNote || !revisionDeadline) {
            return toast.warning("Lütfen açıklama ve tarih giriniz.");
        }

        const endpoint = revisionData.type === 'leader' ? 'leader-resolve' : 'captain-resolve';
        
        try {
            await axios.put(`${API_URL}/tasks/${endpoint}`, { 
                taskId: revisionData.taskId, 
                decision: 'revision', 
                newDeadline: revisionDeadline, 
                revisionNote: revisionNote 
            }, { headers: { 'auth-token': token } });
            
            toast.success("Revizyon iletildi.");
            setShowRevisionModal(false); // Modalı kapat
            fetchProjectTasks(); // Listeyi yenile
        } catch (error) { 
            toast.error('Hata oluştu'); 
        }
    };

    const renderFileLink = (filePath, originalName) => {
        if (!filePath) return null;
        const url = filePath.startsWith('http') ? filePath : `${API_URL}/${filePath}`;
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

    // --- ROLLER ---
    const isCaptain = project.leader && (String(project.leader._id || project.leader) === String(currentUserId));
    
    const isTeamLeader = project.subTeams && project.subTeams.some(t => {
        if (!t.leader) return false;
        const leaderId = t.leader._id || t.leader;
        return String(leaderId) === String(currentUserId);
    });
    
    const canAnnounce = isCaptain || isTeamLeader;

    let mySubTeamMembers = [];
    if (isTeamLeader) {
        const myTeam = project.subTeams.find(t => t.leader && (String(t.leader._id || t.leader) === String(currentUserId)));
        if (myTeam) {
            mySubTeamMembers = myTeam.members.map(m => ({ value: m._id, label: m.name }));
        }
    }

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
                            <button onClick={fetchProjectTasks} style={styles.archiveBtn}>📂 Görevler & Arşiv</button>
                        </div>
                    </div>
                </div>

                {/* DUYURU PANOSU */}
                <div style={styles.announceSection}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                        <h2 style={{margin:0, color:'#2c3e50', fontSize:'1.2rem'}}>📢 Duyuru Panosu</h2>
                        <div style={{display:'flex', gap:'10px'}}>
                            {isCaptain && project.announcements.length > 0 && (
                                <button onClick={handleClearAnnouncements} style={{...styles.announceBtn, backgroundColor:'#e74c3c'}}>🗑️ Temizle</button>
                            )}
                            {canAnnounce && (
                                <button onClick={() => setShowAnnounceForm(!showAnnounceForm)} style={styles.announceBtn}>{showAnnounceForm ? 'Kapat' : '+ Yeni Duyuru'}</button>
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
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                        <h4 style={{margin:'0 0 5px 0', color:'#e67e22'}}>{ann.title}</h4>
                                        {(isCaptain || ann.author === currentUser.id) && (
                                            <button onClick={() => handleDeleteAnnouncement(ann._id)} style={{background:'none', border:'none', cursor:'pointer', color:'#999', fontSize:'1.1rem', padding: '0 5px'}}>✖</button>
                                        )}
                                    </div>
                                    <p style={{margin:0, fontSize:'0.9rem'}}>{ann.content}</p>
                                    <div style={styles.announceMeta}><span>✍️ {ann.authorName}</span><span>🕒 {new Date(ann.createdAt).toLocaleDateString()}</span></div>
                                </div>
                            ))
                        ) : (<p style={{color:'#999', fontSize:'0.9rem'}}>Henüz duyuru yok.</p>)}
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

                    {/* SAĞ: EKİPLER */}
                    <div style={styles.card}>
                        {(isCaptain || isTeamLeader) && (
                            <div style={{ marginBottom: '20px', paddingBottom:'15px', borderBottom:'1px solid #eee' }}>
                                <button onClick={() => setShowTaskModal(true)} style={{...styles.announceBtn, width:'100%', display:'block', fontSize:'1.1rem', padding:'12px'}}>
                                    {isCaptain ? '📝 Takımlara Görev Ver' : '📝 Ekibe Görev Ver'}
                                </button>
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
                
                {/* 1. GÖREV OLUŞTURMA */}
                {showTaskModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <h3>Yeni Görev Oluştur</h3>
                            <form onSubmit={handleCreateTask} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                                <input type="text" placeholder="Görev Başlığı" required style={styles.input} onChange={e => setTaskData({...taskData, title: e.target.value})} />
                                <textarea placeholder="Açıklama" required style={{...styles.input, height:'80px'}} onChange={e => setTaskData({...taskData, description: e.target.value})} />
                                <label style={{fontSize:'0.9rem', fontWeight:'bold'}}>Son Tarih:</label>
                                <input type="date" required style={styles.input} onChange={e => setTaskData({...taskData, deadline: e.target.value})} />
                                {isCaptain && (
                                    <>
                                        <label style={{fontSize:'0.9rem', fontWeight:'bold'}}>Hedef Ekip:</label>
                                        <select required style={styles.select} onChange={e => setTaskData({...taskData, targetTeam: e.target.value})}>
                                            <option value="">Hangi Ekibe?</option>{project.subTeams.map((t, i) => <option key={i} value={t.name}>{t.name}</option>)}
                                        </select>
                                    </>
                                )}
                                {isTeamLeader && (
                                    <>
                                        <label style={{fontSize:'0.9rem', fontWeight:'bold'}}>Kime Atanacak?</label>
                                        <Select options={mySubTeamMembers} isMulti placeholder="Üyeleri seçin..." onChange={(selected) => setTaskData({...taskData, selectedMembers: selected})} />
                                    </>
                                )}
                                <label style={{fontSize:'0.9rem', fontWeight:'bold', marginTop:'10px'}}>Dosya:</label>
                                <input type="file" onChange={e => setTaskImage(e.target.files[0])} />
                                <div style={{display:'flex', gap:'10px', marginTop:'10px'}}><button type="submit" style={styles.addBtn}>Gönder</button><button type="button" onClick={() => setShowTaskModal(false)} style={{...styles.saveBtn, backgroundColor:'#e74c3c'}}>İptal</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 2. GÖREV PANELİ */}
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
                                {(taskTab === 'active' ? activeTasks : completedTasks).map(task => {
                                    
                                    // Sahiplik Kontrolü (Garanti Yöntem)
                                    const ownerId = task.currentOwner && (task.currentOwner._id || task.currentOwner);
                                    const isOwner = String(ownerId) === String(currentUserId);
                                    
                                    return (
                                        <div key={task._id} style={{padding:'15px', border:'1px solid #eee', borderRadius:'8px', backgroundColor: (task.status === 'KaptanOnayinda' || task.status === 'LiderOnayinda') ? '#ebf5fb' : '#fff', borderLeft: (task.status === 'KaptanOnayinda' || task.status === 'LiderOnayinda') ? '5px solid #2980b9' : '1px solid #eee'}}>
                                            <div style={{display:'flex', justifyContent:'space-between'}}>
                                                <h4 style={{margin:0}}>{task.title} <span style={{fontSize:'0.8rem', fontWeight:'normal', color:'#666'}}>({task.targetSubTeam})</span></h4>
                                                <span style={{fontSize:'0.8rem', fontWeight:'bold', color: '#888'}}>
                                                    {task.status === 'KaptanOnayinda' ? 'KAPTAN ONAYI BEKLİYOR' : 
                                                     task.status === 'LiderOnayinda' ? 'LİDER ONAYI BEKLİYOR' : task.status}
                                                </span>
                                            </div>
                                            <p style={{fontSize:'0.9rem', color:'#666', margin:'5px 0'}}>{task.description}</p>
                                            {renderFileLink(task.file, task.originalFileName)}

                                            {/* ÜYELERİN YÜKLEDİKLERİ */}
                                            {task.assignedMembers && task.assignedMembers.some(m => m.isCompleted) && (
                                                <div style={{marginTop:'10px', backgroundColor:'#fff', padding:'10px', borderRadius:'5px', border:'1px solid #eee'}}>
                                                    <strong style={{fontSize:'0.85rem', color:'#34495e'}}>📤 Teslim Edilen Çalışmalar:</strong>
                                                    {task.assignedMembers.map((m, mIdx) => (
                                                        <div key={mIdx} style={{marginTop:'5px', paddingBottom:'5px', borderBottom: mIdx !== task.assignedMembers.length -1 ? '1px dashed #ddd' : 'none'}}>
                                                            <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem'}}>
                                                                <span style={{fontWeight:'bold'}}>{m.member.name}</span>
                                                                <span style={{color: m.isCompleted ? '#27ae60' : '#e74c3c'}}>{m.isCompleted ? '✅ Teslim Etti' : '⏳ Bekleniyor'}</span>
                                                            </div>
                                                            {m.completionNote && <div style={{fontSize:'0.85rem', color:'#555', fontStyle:'italic', marginTop:'2px'}}>" {m.completionNote} "</div>}
                                                            {m.completionFile && renderFileLink(m.completionFile, m.originalCompletionFileName)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* DAĞITIM BUTONU (Delegate) - Sadece Lider için, 'Liderde' statüsünde */}
                                            {isTeamLeader && task.status === 'Liderde' && isOwner && (
                                                <div style={{marginTop:'15px', borderTop:'1px solid #eee', paddingTop:'10px'}}>
                                                    <button onClick={() => openDelegateModal(task._id, task.targetSubTeam)} style={{...styles.actionBtn, width:'100%', backgroundColor:'#f39c12', color:'white'}}>👉 Ekibe Dağıt</button>
                                                </div>
                                            )}

                                            {/* YENİ: LİDER ONAY BUTONLARI */}
                                            {isOwner && task.status === 'LiderOnayinda' && (
                                                <div style={{marginTop:'15px', display:'flex', gap:'10px', justifyContent:'flex-end', borderTop:'1px solid #eee', paddingTop:'10px'}}>
                                                    {/* Revizyon için modalı açıyoruz type='leader' */}
                                                    <button onClick={() => openRevisionModal(task._id, 'leader')} style={{...styles.saveBtn, backgroundColor:'#e74c3c'}}>↩ Revizyon İste</button>
                                                    
                                                    {/* Onay için direkt fonksiyonu çağırıyoruz */}
                                                    <button onClick={() => handleApproveDirect(task._id, 'leader')} style={{...styles.saveBtn, backgroundColor:'#27ae60'}}>✅ Onayla</button>
                                                </div>
                                            )}

                                            {/* KAPTAN BUTONLARI */}
                                            {isCaptain && task.status === 'KaptanOnayinda' && (
                                                <div style={{marginTop:'15px', display:'flex', gap:'10px', justifyContent:'flex-end', borderTop:'1px solid #eee', paddingTop:'10px'}}>
                                                    {/* Revizyon için modalı açıyoruz type='captain' */}
                                                    <button onClick={() => openRevisionModal(task._id, 'captain')} style={{...styles.saveBtn, backgroundColor:'#e74c3c'}}>↩ Revizyon İste</button>
                                                    
                                                    {/* Onay için direkt fonksiyonu çağırıyoruz */}
                                                    <button onClick={() => handleApproveDirect(task._id, 'captain')} style={{...styles.saveBtn, backgroundColor:'#27ae60'}}>✅ Onayla</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {(taskTab === 'active' ? activeTasks : completedTasks).length === 0 && <p style={{color:'#999'}}>Görev yok.</p>}
                            </div>
                        </div>
                    </div>
                )}
                {/* --- REVİZYON MODALI --- */}
                {showRevisionModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <div style={{borderBottom:'1px solid #eee', paddingBottom:'10px', marginBottom:'15px'}}>
                                <h3 style={{margin:0, color:'#e74c3c'}}>↩ Revizyon Talebi</h3>
                                <p style={{margin:'5px 0 0 0', fontSize:'0.9rem', color:'#666'}}>
                                    Görevi neden reddettiğinizi ve yeni tarihi belirtin.
                                </p>
                            </div>
                            
                            <form onSubmit={submitRevision} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                                <div>
                                    <label style={{fontSize:'0.9rem', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Revizyon Notu:</label>
                                    <textarea 
                                        placeholder="Örn: Raporun giriş kısmı eksik, lütfen tamamla..." 
                                        required 
                                        style={{...styles.input, height:'100px', resize:'none'}} 
                                        value={revisionNote}
                                        onChange={e => setRevisionNote(e.target.value)} 
                                    />
                                </div>

                                <div>
                                    <label style={{fontSize:'0.9rem', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Yeni Teslim Tarihi:</label>
                                    <input 
                                        type="date" 
                                        required 
                                        style={styles.input} 
                                        value={revisionDeadline}
                                        onChange={e => setRevisionDeadline(e.target.value)} 
                                    />
                                </div>
                                
                                <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'10px'}}>
                                    <button type="button" onClick={() => setShowRevisionModal(false)} style={{...styles.saveBtn, backgroundColor:'#95a5a6'}}>İptal</button>
                                    <button type="submit" style={{...styles.saveBtn, backgroundColor:'#e74c3c'}}>Revizyonu Gönder</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* --- DELEGATE MODAL --- */}
                {delegateModal.show && (
                    <div style={styles.modalOverlay}>
                        <div style={{...styles.modalContent, width: '500px'}}>
                            <h3>Görev Dağıtımı</h3>
                            <p style={{fontSize:'0.9rem', color:'#666', marginBottom:'15px'}}>Bu görevi kimlerin yapacağını seçin.</p>
                            
                            <div style={{maxHeight:'300px', overflowY:'auto'}}>
                                {assignments.map((assign, index) => (
                                    <div key={index} style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                        <select 
                                            style={{...styles.select, flex:1}} 
                                            value={assign.memberId} 
                                            onChange={(e) => handleAssignmentChange(index, 'memberId', e.target.value)}
                                        >
                                            <option value="">Üye Seç...</option>
                                            {delegateModal.projectMembers.map(m => (
                                                <option key={m._id} value={m._id}>{m.name}</option>
                                            ))}
                                        </select>
                                        <input 
                                            type="text" 
                                            placeholder="Özel not..." 
                                            value={assign.note} 
                                            onChange={(e) => handleAssignmentChange(index, 'note', e.target.value)} 
                                            style={{...styles.input, flex:2, marginBottom:0}} 
                                        />
                                        {assignments.length > 1 && (
                                            <button onClick={() => removeAssignmentRow(index)} style={{background:'none', border:'none', color:'red', cursor:'pointer'}}>🗑️</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <button onClick={addAssignmentRow} style={{...styles.saveBtn, backgroundColor:'#f1c40f', color:'#333', marginBottom:'15px'}}>+ Kişi Ekle</button>
                            
                            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                                <button onClick={() => setDelegateModal({show:false, taskId:null, projectMembers:[]})} style={{...styles.saveBtn, backgroundColor:'#ccc'}}>İptal</button>
                                <button onClick={handleDelegateTask} style={styles.saveBtn}>Onayla ve Dağıt</button>
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
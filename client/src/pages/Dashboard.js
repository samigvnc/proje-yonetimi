import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../apiConfig';

const Dashboard = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [myTasks, setMyTasks] = useState([]); 
    
    // UI State'leri
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    
    // MODAL STATE
    const [completeModal, setCompleteModal] = useState({ show: false, taskId: null });
    const [completionNote, setCompletionNote] = useState('');
    const [completionFile, setCompletionFile] = useState(null);

    // Formlar
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [previewProject, setPreviewProject] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState('');

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const projRes = await axios.get(`${API_URL}/projects`, { headers: { 'auth-token': token } });
            setProjects(projRes.data);
            const taskRes = await axios.get(`${API_URL}/tasks/my-tasks`, { headers: { 'auth-token': token } });
            setMyTasks(taskRes.data);
        } catch (error) { console.error(error); }
    };

    // --- PROJE İŞLEMLERİ ---
    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/projects/create`, { name: newProjectName, description: newProjectDesc }, { headers: { 'auth-token': token } });
            toast.success('Proje oluşturuldu!'); setShowCreateModal(false); fetchData();
        } catch (error) { toast.error('Hata'); }
    };

    const handleCheckCode = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.get(`${API_URL}/projects/preview/${joinCode}`, { headers: { 'auth-token': token } });
            setPreviewProject(res.data);
        } catch (error) { toast.error("Geçersiz Kod"); }
    };

    const handleJoinProject = async () => {
        try {
            await axios.post(`${API_URL}/projects/join`, { joinCode: joinCode, subTeamName: selectedTeam }, { headers: { 'auth-token': token } });
            toast.success('Katıldınız!'); setShowJoinModal(false); setPreviewProject(null); fetchData();
        } catch (error) { toast.error('Hata'); }
    };

    // --- GÖREV İŞLEMLERİ (SADELEŞTİRİLDİ) ---

    // 1. ÜYE: TAMAMLA MODALINI AÇ
    const openCompleteModal = (taskId) => {
        setCompleteModal({ show: true, taskId });
        setCompletionNote('');
        setCompletionFile(null);
    };

    // 2. ÜYE: GÖREVİ GÖNDER
    const submitCompleteTask = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('taskId', completeModal.taskId);
        formData.append('note', completionNote);
        if (completionFile) formData.append('file', completionFile);

        try {
            await axios.put(`${API_URL}/tasks/complete`, formData, { 
                headers: { 'auth-token': token, 'Content-Type': 'multipart/form-data' } 
            });
            toast.success("Görev teslim edildi!");
            setCompleteModal({ show: false, taskId: null });
            fetchData();
        } catch (error) { toast.error('Hata'); }
    };

    // Dosya Linki
    const renderFileLink = (filePath, originalName) => {
        if (!filePath) return null;
        const url = filePath.startsWith('http') ? filePath : `${API_URL}/${filePath}`;
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" style={{display:'block', marginTop:'10px', color:'#3498db', fontWeight:'bold'}}>
                📎 {originalName || 'Dosyayı İndir'}
            </a>
        );
    };

    return (
        <div style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', paddingBottom: '50px' }}>
            <Navbar />
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                
                {myTasks.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>📋 İş Akışı</h2>
                        <div style={styles.grid}>
                            {myTasks.filter(task => task.status !== 'Tamamlandi').map(task => {
                                const myAssignment = task.assignedMembers.find(m => m.member._id === user.id);
                                const isMyTaskCompleted = myAssignment ? myAssignment.isCompleted : false;
                                const ownerId = task.currentOwner && (task.currentOwner._id || task.currentOwner);
                                // Giriş yapan kişi şu anki sorumlu mu? (Lider veya Kaptan)
                                const isResponsible = String(ownerId) === String(user.id);
                                let borderColor = '#e67e22'; 
                                if (task.status === 'Tamamlandi') borderColor = '#27ae60';
                                else if (task.status === 'LiderOnayinda') borderColor = '#8e44ad';
                                else if (task.status === 'KaptanOnayinda') borderColor = '#2980b9'; 

                                return (
                                    <div key={task._id} style={{ ...styles.projectCard, borderLeft: `5px solid ${borderColor}` }}>
                                        <div style={{display:'flex', justifyContent:'space-between'}}>
                                            <small style={{backgroundColor:'#eee', padding:'2px 5px', borderRadius:'3px'}}>{task.project.name}</small>
                                            <small style={{fontWeight:'bold'}}>
                                                {task.status === 'Liderde' ? '🟠 Atama Bekliyor' :
                                                 task.status === 'Uyelerde' ? '🔵 Ekip Çalışıyor' :
                                                 task.status === 'LiderOnayinda' ? '🟣 Lider Onayı' :
                                                 task.status === 'KaptanOnayinda' ? '👮‍♂️ Kaptan Onayı' : '✅ Bitti'}
                                            </small>
                                        </div>
                                        
                                        <h3 style={{margin:'10px 0'}}>{task.title}</h3>
                                        <p style={{fontSize:'0.9rem', color:'#666'}}>{task.description}</p>
                                        
                                        {task.status === 'Uyelerde' && myAssignment && myAssignment.instruction && (
                                            <div style={{backgroundColor:'#e8f8f5', padding:'8px', borderRadius:'5px', borderLeft:'3px solid #1abc9c', margin:'10px 0', fontSize:'0.9rem'}}>
                                                <strong>🔔 Sana Not:</strong> {myAssignment.instruction}
                                            </div>
                                        )}

                                        {renderFileLink(task.file, task.originalFileName)}

                                        <div style={{marginTop:'15px', borderTop:'1px solid #eee', paddingTop:'10px'}}>
                                            {/* SADECE ÜYE İŞLEMLERİ (Lider/Kaptan İşlemleri ProjectDetails'te) */}
                                            {task.status === 'Uyelerde' && myAssignment && !isMyTaskCompleted && (
                                                <button onClick={() => openCompleteModal(task._id)} style={{...styles.actionBtn, backgroundColor:'#27ae60'}}>✅ Tamamla ve Gönder</button>
                                            )}
                                            {task.status === 'Uyelerde' && myAssignment && isMyTaskCompleted && (
                                                <span style={{color:'#7f8c8d', fontSize:'0.9rem'}}>⏳ Diğerleri bekleniyor...</span>
                                            )}
                                            
                                            {(task.status === 'LiderOnayinda' || task.status === 'KaptanOnayinda') && isResponsible && (
                                                <button onClick={() => navigate(`/project/${task.project._id}`)} style={styles.actionBtn}>👉 Onaylamak İçin Projeye Git</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={styles.actionArea}><button style={styles.createBtn} onClick={() => setShowCreateModal(true)}>+ Yeni Proje</button><button style={styles.joinBtn} onClick={() => setShowJoinModal(true)}># Katıl</button></div>
                <div style={styles.grid}>{projects.map(p => (<div key={p._id} style={styles.projectCard} onClick={() => navigate(`/project/${p._id}`)}><h3>{p.name}</h3><p>{p.description}</p></div>))}</div>

                {/* MODALLAR */}
                {showCreateModal && (<div style={styles.modalOverlay}><div style={styles.formCard}><h3>Proje Oluştur</h3><form onSubmit={handleCreateProject} style={{display:'flex', flexDirection:'column', gap:'10px'}}><input type="text" placeholder="Ad" value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} required style={styles.input}/><input type="text" placeholder="Açıklama" value={newProjectDesc} onChange={e=>setNewProjectDesc(e.target.value)} style={styles.input}/><button type="submit" style={styles.saveBtn}>Kaydet</button><button type="button" onClick={()=>setShowCreateModal(false)} style={{...styles.saveBtn, backgroundColor:'#ccc'}}>Kapat</button></form></div></div>)}
                {showJoinModal && (<div style={styles.modalOverlay}><div style={styles.formCard}><h3>Katıl</h3>{!previewProject ? (<form onSubmit={handleCheckCode}><input type="text" placeholder="Kod" value={joinCode} onChange={e=>setJoinCode(e.target.value)} style={styles.input}/><button type="submit" style={styles.joinBtn}>Bul</button></form>) : (<div><p>{previewProject.name}</p><select style={styles.input} onChange={e=>setSelectedTeam(e.target.value)}><option value="">Ekip Seç</option>{previewProject.subTeams.map(t=><option key={t.name} value={t.name}>{t.name}</option>)}</select><button onClick={handleJoinProject} style={styles.createBtn}>Katıl</button></div>)}<button onClick={()=>setShowJoinModal(false)} style={{marginTop:'10px'}}>Kapat</button></div></div>)}
                
                {/* ÜYE TAMAMLAMA MODALI */}
                {completeModal.show && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.formCard}>
                            <h3>Görevi Teslim Et</h3>
                            <form onSubmit={submitCompleteTask} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                                <textarea placeholder="Neler yaptın? Açıklama yaz..." required style={{...styles.input, height:'100px'}} onChange={e => setCompletionNote(e.target.value)}/>
                                <label style={{fontSize:'0.9rem'}}>Dosya Ekle (Opsiyonel):</label>
                                <input type="file" onChange={e => setCompletionFile(e.target.files[0])} />
                                <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                                    <button type="submit" style={styles.saveBtn}>Gönder</button>
                                    <button type="button" onClick={() => setCompleteModal({show:false, taskId:null})} style={{...styles.saveBtn, backgroundColor:'#e74c3c'}}>İptal</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    actionArea: { display: 'flex', gap: '20px', marginBottom: '20px' },
    createBtn: { padding: '10px 20px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    joinBtn: { padding: '10px 20px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
    projectCard: { backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid #eee' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    formCard: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', width:'400px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' },
    input: { padding: '10px', borderRadius: '5px', border: '1px solid #ddd', width: '100%', boxSizing:'border-box', marginBottom:'10px' },
    saveBtn: { padding: '8px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight:'5px' },
    actionBtn: { width:'100%', padding:'8px', backgroundColor:'#2980b9', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold' }
};

export default Dashboard;
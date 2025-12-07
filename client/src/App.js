// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Sayfalar
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';

// Bileşenler
import Footer from './components/Footer'; // <-- FOOTER'I IMPORT ETTİK

function App() {
  return (
    <Router>
      {/* Sayfa yapısını dikey flex yaptık */}
      <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        
        <ToastContainer position="top-right" autoClose={3000} />
        
        {/* İçerik Alanı: flex: 1 diyerek boşluğu doldurmasını sağlıyoruz */}
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/project/:id" element={<ProjectDetails />} />
          </Routes>
        </div>

        {/* Footer en altta */}
        <Footer />
        
      </div>
    </Router>
  );
}

export default App;
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Eğer index.css dosyasını da sildiysen bu satırı da sil
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
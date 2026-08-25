// src/main.tsx — Ça Parle
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Force new bundle hash after legacy SW cleanup
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
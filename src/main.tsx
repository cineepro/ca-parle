// src/main.tsx — Vanessa
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ⚠️ L'appel killLegacyServiceWorker() a été retiré d'ici volontairement.
// Il dupliquait dans le BUNDLE PRINCIPAL (visible publiquement, scanné par
// les outils de réputation) le même pattern "unregister + vidage de cache
// + navigation forcée" que public/sw.js — un pattern structurellement
// identique à des scripts de nettoyage utilisés par certains malwares de
// type navigateur-hijacker, ce qui a très probablement déclenché le
// signalement "Suspicious Javascript code" côté urlquery.
// public/sw.js seul suffit : il tourne dans son propre contexte isolé
// (jamais inclus dans ce bundle) et a déjà eu le temps de nettoyer les
// navigateurs des utilisateurs actifs depuis son déploiement. Si un très
// vieux compte revient après une longue absence avec l'ancien Service
// Worker Kinema+ encore actif, public/sw.js suffira à le neutraliser au
// prochain contrôle de mise à jour du navigateur — sans qu'on ait besoin
// de répéter cette logique côté client à chaque chargement de page.

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

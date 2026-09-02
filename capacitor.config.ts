// capacitor.config.ts — Ça Parle
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    // appId : identifiant unique de l'app dans les stores — format inversé
    // de domaine, ne change plus jamais une fois publié.
    appId: 'com.kinemaplus.caparle',
    appName: 'Ça Parle',
    // Capacitor empaquette ce dossier DANS l'app (chargé localement,
    // instantanément) — c'est exactement lui qui répond à ton besoin de
    // vitesse : plus besoin de retélécharger le JS/CSS à chaque ouverture.
    webDir: 'dist',
    server: {
        // Autorise le contenu local à appeler Appwrite (nyc.cloud.appwrite.io)
        // et les autres domaines externes (Resend, ElevenLabs passent par
        // les Functions donc pas concernés ici) sans restriction CORS liée
        // au schéma "capacitor://" utilisé par défaut sur Android/iOS.
        androidScheme: 'https',
    },
};

export default config;

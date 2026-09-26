// src/pages/BusinessAgentPage.tsx — Vanessa
import { Link } from 'react-router-dom';

interface Channel {
    name: string;
    description: string;
    detail: string;
}

const CHANNELS: Channel[] = [
    {
        name: 'Email',
        description: "Vanessa rédige et envoie des emails à vos clients, dans son ton, depuis votre propre adresse.",
        detail: 'Connexion via votre compte Gmail/Outlook — jamais de mot de passe partagé.',
    },
    {
        name: 'WhatsApp',
        description: 'Elle répond à vos clients sur votre numéro WhatsApp Business, dans les délais autorisés par la plateforme.',
        detail: 'Nécessite un compte WhatsApp Business officiel, propre à votre entreprise.',
    },
    {
        name: 'Réseaux sociaux',
        description: 'Elle répond aux commentaires sur vos publications Facebook ou Instagram, avec votre voix.',
        detail: 'Connexion via votre page professionnelle Meta.',
    },
];

export default function BusinessAgentPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-5">
                <Link to="/accueil" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>

                <div className="bg-white rounded-3xl p-6 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold text-gray-800">Vanessa pour les entreprises</h1>
                        <span className="bg-gray-100 text-gray-500 text-[11px] font-bold rounded-full px-2.5 py-1">
                            Bientôt disponible
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">
                        Le ton et la personnalité de Vanessa, au service de votre propre entreprise — pour parler à
                        vos clients là où ils sont déjà, dans le langage qui leur ressemble.
                    </p>
                </div>

                <div className="space-y-3">
                    {CHANNELS.map((channel) => (
                        <div key={channel.name} className="bg-white rounded-2xl border border-gray-100 p-5 opacity-70">
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                                <h2 className="text-base font-bold text-gray-700">{channel.name}</h2>
                                <button
                                    disabled
                                    className="shrink-0 bg-gray-100 text-gray-400 text-xs font-semibold rounded-full px-4 py-2 cursor-not-allowed"
                                >
                                    Connecter — bientôt
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 mb-1.5">{channel.description}</p>
                            <p className="text-xs text-gray-400">{channel.detail}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-[#FFF0F1] rounded-2xl p-5 space-y-1.5">
                    <p className="text-sm font-semibold text-gray-800">Pourquoi ce n'est pas encore actif</p>
                    <p className="text-sm text-gray-600">
                        On préfère d'abord bien faire ce qui existe déjà, et vérifier que cette idée trouve vraiment
                        preneur, avant de s'engager dans un chantier plus lourd (chaque canal a ses propres règles
                        d'approbation, notamment WhatsApp et les réseaux sociaux). Cette page restera à jour à mesure
                        que ça avance.
                    </p>
                </div>
            </div>
        </div>
    );
}
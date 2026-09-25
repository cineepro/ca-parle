// src/features/onboarding/components/CommunityRulesModal.tsx — Vanessa
import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

const STORAGE_KEY_PREFIX = 'ca_parle_rules_seen_';

const RULES = [
    { icon: '🙅‍♀️', text: "Ne cible jamais une personne réelle par son nom complet ou des détails qui l'identifient clairement dans une accusation grave (infidélité, délit...) sans preuve." },
    { icon: '🔞', text: 'Aucun contenu sexuel impliquant des personnes réelles, et surtout jamais concernant des mineurs — tolérance zéro.' },
    { icon: '🚫', text: 'Pas de harcèlement, de menaces, ni de divulgation de données privées de quelqu\'un (adresse, numéro...) sans son accord.' },
    { icon: '🕵️', text: "L'anonymat protège ton identité vis-à-vis des autres utilisateurs, pas vis-à-vis de la plateforme en cas de signalement grave." },
    { icon: '🚩', text: 'Signale tout contenu qui te semble abusif — notre équipe de modération traite chaque signalement.' },
];

export const CommunityRulesModal = () => {
    const { user } = useAuth();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!user) return;
        const key = `${STORAGE_KEY_PREFIX}${user.$id}`;
        if (!localStorage.getItem(key)) {
            setVisible(true);
        }
    }, [user]);

    const accept = () => {
        if (user) {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${user.$id}`, 'seen');
        }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="text-center">
                    <div className="text-3xl mb-2">👋</div>
                    <h2 className="text-lg font-bold text-gray-800">Bienvenue sur Vanessa</h2>
                    <p className="text-xs text-gray-400 mt-1">Quelques règles avant de commencer</p>
                </div>

                <div className="space-y-3">
                    {RULES.map((rule, i) => (
                        <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-2xl p-3">
                            <span className="text-lg shrink-0">{rule.icon}</span>
                            <p className="text-sm text-gray-600 leading-relaxed">{rule.text}</p>
                        </div>
                    ))}
                </div>

                <button
                    onClick={accept}
                    className="w-full bg-[#FF4757] text-white font-semibold py-3 rounded-xl hover:bg-[#e63e4d] transition-colors"
                >
                    J'ai compris, c'est parti
                </button>
            </div>
        </div>
    );
};

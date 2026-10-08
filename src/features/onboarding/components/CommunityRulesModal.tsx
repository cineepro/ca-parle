// src/features/onboarding/components/CommunityRulesModal.tsx — Vanessa
import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { VANESSA_AVATAR_URL } from '@/api/constants';
import { Button } from '@/components/ui/button';
import { UserX, ShieldAlert, Ban, EyeOff, Flag, type LucideIcon } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'ca_parle_rules_seen_';

const RULES: { Icon: LucideIcon; text: string }[] = [
    { Icon: UserX, text: "Ne cible jamais une personne réelle par son nom complet ou des détails qui l'identifient clairement dans une accusation grave (infidélité, délit...) sans preuve." },
    { Icon: ShieldAlert, text: 'Aucun contenu sexuel impliquant des personnes réelles, et surtout jamais concernant des mineurs — tolérance zéro.' },
    { Icon: Ban, text: 'Pas de harcèlement, de menaces, ni de divulgation de données privées de quelqu\'un (adresse, numéro...) sans son accord.' },
    { Icon: EyeOff, text: "L'anonymat protège ton identité vis-à-vis des autres utilisateurs, pas vis-à-vis de la plateforme en cas de signalement grave." },
    { Icon: Flag, text: 'Signale tout contenu qui te semble abusif — notre équipe de modération traite chaque signalement.' },
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
        <div className="fixed inset-0 bg-ink/50 flex items-end sm:items-center justify-center z-50 sm:px-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="rules-title"
                className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-xl"
            >
                <div className="text-center">
                    <img src={VANESSA_AVATAR_URL} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-3 ring-4 ring-brand" />
                    <h2 id="rules-title" className="text-2xl font-semibold text-ink">Bienvenue sur Vanessa</h2>
                    <p className="text-base text-gray-600 mt-1">Quelques règles avant de commencer</p>
                </div>

                <ul className="space-y-3">
                    {RULES.map(({ Icon, text }, i) => (
                        <li key={i} className="flex items-start gap-3 bg-sand rounded-xl p-3">
                            <Icon className="w-5 h-5 text-ochre shrink-0 mt-0.5" aria-hidden="true" />
                            <p className="text-base text-gray-700 leading-relaxed">{text}</p>
                        </li>
                    ))}
                </ul>

                <Button onClick={accept} size="lg" fullWidth>
                    J'ai compris, c'est parti
                </Button>
            </div>
        </div>
    );
};

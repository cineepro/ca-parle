// src/features/stories/components/InviteButton.tsx — Ça Parle
// Partage un lien vers la plateforme (pas une histoire précise), avec un
// paramètre ?ref=<userId> pour garder une trace basique de qui invite qui
// — non exploité pour l'instant (pas de système de récompense de
// parrainage construit), mais gratuit à poser dès maintenant pour ne pas
// avoir à modifier tous les liens déjà partagés plus tard si tu ajoutes
// cette fonctionnalité.
import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const InviteButton = () => {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    const url = user
        ? `${window.location.origin}/register?ref=${user.$id}`
        : window.location.origin;

    const message = "Rejoins-moi sur Ça Parle 👀 « Ça parle de quoi aujourd'hui ? »";

    const handleInvite = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Ça Parle', text: message, url });
            } catch {
                // Annulé par l'utilisateur.
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(`${message} ${url}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* rien de plus à faire */ }
    };

    return (
        <button
            type="button"
            onClick={handleInvite}
            className="flex items-center gap-1.5 bg-[#FF4757]/5 text-[#FF4757] rounded-full px-3.5 py-2 text-sm font-medium hover:bg-[#FF4757]/10 transition-colors"
        >
            {copied ? '✅ Lien copié' : '📢 Inviter des amis'}
        </button>
    );
};

// src/features/stories/components/InviteButton.tsx — Vanessa
// Partage un lien vers la plateforme (pas une histoire précise), avec un
// paramètre ?ref=<userId> pour garder une trace basique de qui invite qui
// — non exploité pour l'instant (pas de système de récompense de
// parrainage construit), mais gratuit à poser dès maintenant pour ne pas
// avoir à modifier tous les liens déjà partagés plus tard si tu ajoutes
// cette fonctionnalité.
import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CheckCircle2, Megaphone } from 'lucide-react';

export const InviteButton = () => {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    const url = user
        ? `${window.location.origin}/register?ref=${user.$id}`
        : window.location.origin;

    const message = "Rejoins-moi sur Vanessa — celle qui vous ressemble et vous rassemble";

    const handleInvite = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Vanessa', text: message, url });
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
            className="flex items-center gap-1.5 bg-brand-tint text-ochre rounded-full px-3.5 py-2 text-sm font-medium hover:bg-brand-strong transition-colors"
        >
            {copied ? <><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Lien copié</> : <><Megaphone className="w-4 h-4" aria-hidden="true" /> Inviter des amis</>}
        </button>
    );
};

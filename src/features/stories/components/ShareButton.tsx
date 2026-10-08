// src/features/stories/components/ShareButton.tsx — Vanessa
import { useState } from 'react';
import { CheckCircle2, Share2 } from 'lucide-react';

interface Props {
    storyId: string;
    title: string;
}

export const ShareButton = ({ storyId, title }: Props) => {
    const [copied, setCopied] = useState(false);
    const url = `${window.location.origin}/histoire/${storyId}`;

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Web Share API : ouvre le sélecteur natif (WhatsApp, SMS, etc.)
        // sur mobile. Pas de vérification de disponibilité côté serveur —
        // simple détection du support navigateur.
        if (navigator.share) {
            try {
                await navigator.share({ title: `Vanessa — ${title}`, url });
            } catch {
                // L'utilisateur a annulé le partage — rien à faire.
            }
            return;
        }

        // Repli desktop : copie du lien dans le presse-papier.
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Rien de plus à faire si le presse-papier est inaccessible.
        }
    };

    return (
        <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-ochre transition-colors min-h-[32px]"
        >
            {copied ? <><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Lien copié</> : <><Share2 className="w-4 h-4" aria-hidden="true" /> Partager</>}
        </button>
    );
};

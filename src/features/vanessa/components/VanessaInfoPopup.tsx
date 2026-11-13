// src/features/vanessa/components/VanessaInfoPopup.tsx — Vanessa
// Pop-up d'information tiré au hasard à chaque ouverture d'une conversation
// avec Vanessa. À monter UNIQUEMENT dans la page d'une conversation avec Vanessa.
// Si aucun message n'est actif (ou si la lecture échoue), rien ne s'affiche.
import { useEffect, useState } from 'react';
import { vanessaPopupService, type VanessaPopup } from '../services/vanessaPopupService';
import { Button } from '@/components/ui/button';

interface Props {
    // Change à chaque conversation : un nouveau pop-up est tiré à chaque ouverture.
    conversationId: string;
}

export const VanessaInfoPopup = ({ conversationId }: Props) => {
    const [popup, setPopup] = useState<VanessaPopup | null>(null);

    useEffect(() => {
        let cancelled = false;
        setPopup(null);
        vanessaPopupService.pickRandom().then((picked) => {
            if (!cancelled) setPopup(picked);
        });
        return () => {
            cancelled = true;
        };
    }, [conversationId]);

    // Fermeture avec la touche Échap
    useEffect(() => {
        if (!popup) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPopup(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [popup]);

    if (!popup) return null;

    const close = () => setPopup(null);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-4 md:pb-0"
            onClick={close}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="vanessa-popup-title"
                className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center space-y-2">
                    {popup.icon && <div className="text-4xl" aria-hidden="true">{popup.icon}</div>}
                    <h2 id="vanessa-popup-title" className="text-base font-bold text-gray-800">
                        {popup.title}
                    </h2>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{popup.message}</p>
                </div>
                <Button onClick={close} className="w-full">
                    {popup.buttonLabel || "J'ai compris"}
                </Button>
            </div>
        </div>
    );
};
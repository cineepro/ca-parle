// src/features/onboarding/components/CookieConsentBanner.tsx — Ça Parle
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ca_parle_cookie_consent';

export const CookieConsentBanner = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem(STORAGE_KEY)) {
            setVisible(true);
        }
    }, []);

    const accept = () => {
        localStorage.setItem(STORAGE_KEY, 'accepted');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-lg px-4 py-4">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3">
                <p className="text-xs text-gray-600 flex-1">
                    🍪 Ça Parle utilise le stockage local de ton navigateur pour te garder connecté(e) et te souvenir de tes préférences.
                    Pas de cookie publicitaire tiers. Voir notre{' '}
                    <a href="/privacy" className="text-[#FF4757] underline">politique de confidentialité</a>.
                </p>
                <button
                    onClick={accept}
                    className="shrink-0 bg-[#FF4757] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#e63e4d] transition-colors"
                >
                    J'ai compris
                </button>
            </div>
        </div>
    );
};

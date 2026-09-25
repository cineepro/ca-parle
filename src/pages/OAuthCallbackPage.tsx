// src/pages/OAuthCallbackPage.tsx — Vanessa
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '@/features/auth/services/authService';
import { useAuth } from '@/features/auth/hooks/useAuth';

// Point d'arrivée après une connexion Google — Appwrite redirige ici avec
// ?userId=...&secret=... dans l'URL (flux createOAuth2Token, voir
// api/auth.ts). C'est CETTE page, sur le domaine de l'app, qui crée
// réellement la session — jamais Appwrite directement, pour ne pas
// dépendre d'un cookie tiers que certains navigateurs bloquent.
export default function OAuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refresh } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const attempted = useRef(false);

    useEffect(() => {
        if (attempted.current) return;
        attempted.current = true;

        const userId = searchParams.get('userId');
        const secret = searchParams.get('secret');

        if (!userId || !secret) {
            setError('Connexion Google incomplète — réessaie.');
            setTimeout(() => navigate('/login', { replace: true }), 2000);
            return;
        }

        authService.completeOAuthSession(userId, secret)
            .then(() => refresh())
            .then(() => navigate('/accueil', { replace: true }))
            .catch((err) => {
                console.error('[OAuthCallback] Échec de la création de session :', err);
                setError('Impossible de finaliser la connexion Google — réessaie.');
                setTimeout(() => navigate('/login', { replace: true }), 2500);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
            {error ? (
                <p className="text-sm text-red-500">{error}</p>
            ) : (
                <>
                    <div className="w-10 h-10 border-3 border-[#FF4757] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Finalisation de ta connexion...</p>
                </>
            )}
        </div>
    );
}
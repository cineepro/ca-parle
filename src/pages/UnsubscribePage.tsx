// src/pages/UnsubscribePage.tsx — Vanessa
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { newsletterService } from '@/features/newsletter/services/newsletterService';

type Status = 'loading' | 'success' | 'error';

export default function UnsubscribePage() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<Status>('loading');

    useEffect(() => {
        const run = async () => {
            const userId = searchParams.get('userId');
            const token = searchParams.get('token');
            if (!userId || !token) {
                setStatus('error');
                return;
            }
            try {
                await newsletterService.unsubscribe(userId, token);
                setStatus('success');
            } catch {
                setStatus('error');
            }
        };
        run();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center space-y-4">
                {status === 'loading' && <p className="text-sm text-gray-400">Traitement en cours...</p>}
                {status === 'success' && (
                    <>
                        <div className="text-4xl">✅</div>
                        <p className="text-sm text-gray-700">Tu ne recevras plus la newsletter de Vanessa.</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="text-4xl">⚠️</div>
                        <p className="text-sm text-gray-700">Lien invalide ou expiré.</p>
                    </>
                )}
                <Link to="/" className="text-[#FF4757] font-semibold hover:underline text-sm">
                    Retour à Vanessa
                </Link>
            </div>
        </div>
    );
}

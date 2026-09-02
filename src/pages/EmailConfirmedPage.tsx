// src/pages/EmailConfirmedPage.tsx — Ça Parle
// Appelée quand l'utilisateur clique sur le lien reçu par email :
// Appwrite redirige vers /email-confirmed?userId=...&secret=...
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { account } from '@/api/appwrite';
import { dbService } from '@/api/database';

type Status = 'loading' | 'success' | 'error';

export default function EmailConfirmedPage() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<Status>('loading');

    useEffect(() => {
        const confirm = async () => {
            const userId = searchParams.get('userId');
            const secret = searchParams.get('secret');

            if (!userId || !secret) {
                setStatus('error');
                return;
            }

            try {
                await account.updateVerification(userId, secret);

                // Filet de sécurité : si le profil "users" n'a pas encore
                // été créé (permissions strictes avant vérification), on le
                // crée maintenant avec le téléphone en attente s'il existe.
                const pendingUserId = sessionStorage.getItem('pendingVerificationUserId');
                const pendingEmail = sessionStorage.getItem('pendingVerificationEmail');
                const pendingPhone = sessionStorage.getItem('pendingPhone');

                if (pendingUserId === userId) {
                    try {
                        await dbService.getUserProfile(userId);
                    } catch {
                        try {
                            await dbService.createUserProfile({
                                userId,
                                name: '', // sera complété au premier login via account.get()
                                email: pendingEmail || '',
                                phone: pendingPhone || undefined,
                                createdAt: new Date().toISOString(),
                            });
                        } catch (err) {
                            console.error('[EmailConfirmedPage] Création profil échouée :', err);
                        }
                    }
                }

                sessionStorage.removeItem('pendingVerificationEmail');
                sessionStorage.removeItem('pendingVerificationUserId');
                sessionStorage.removeItem('pendingPhone');

                setStatus('success');
            } catch (err) {
                console.error('[EmailConfirmedPage] Vérification échouée :', err);
                setStatus('error');
            }
        };

        confirm();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 text-center space-y-4">
                {status === 'loading' && (
                    <>
                        <div className="text-5xl">⏳</div>
                        <p className="text-sm text-gray-500">Vérification en cours...</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div className="text-5xl">✅</div>
                        <h1 className="text-xl font-bold text-gray-800">Email confirmé !</h1>
                        <p className="text-sm text-gray-500">Ton compte est activé, tu peux te connecter.</p>
                        <Link
                            to="/login"
                            className="inline-block bg-[#FF4757] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#e63e4d] transition-all"
                        >
                            Se connecter
                        </Link>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="text-5xl">⚠️</div>
                        <h1 className="text-xl font-bold text-gray-800">Lien invalide ou expiré</h1>
                        <p className="text-sm text-gray-500">Réessaie de t'inscrire ou renvoie un nouvel email.</p>
                        <Link to="/login" className="text-[#FF4757] font-semibold hover:underline">
                            Retour à la connexion
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

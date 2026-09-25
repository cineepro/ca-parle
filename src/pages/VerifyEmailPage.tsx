// src/pages/VerifyEmailPage.tsx — Vanessa
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { authService } from '@/features/auth/services/authService';
import { account } from '@/api/appwrite';

export default function VerifyEmailPage() {
    const email = sessionStorage.getItem('pendingVerificationEmail');
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

    // Pour renvoyer l'email, il faut une session active (createVerification
    // l'exige). On redemande donc le mot de passe si besoin.
    const handleResend = async () => {
        if (!email) return;
        if (!password) {
            setShowPasswordPrompt(true);
            return;
        }
        setResending(true);
        setError(null);
        try {
            await authService.loginForVerification(email, password);
            const redirectUrl = `${window.location.origin}/email-confirmed`;
            await account.createVerification(redirectUrl);
            try { await account.deleteSession('current'); } catch { /* silencieux */ }
            setResent(true);
        } catch {
            setError("Impossible de renvoyer l'email. Vérifie ton mot de passe.");
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 text-center space-y-4">
                <div className="text-5xl">📧</div>
                <h1 className="text-xl font-bold text-gray-800">Vérifie ta boîte mail</h1>
                <p className="text-sm text-gray-500">
                    On a envoyé un lien de confirmation
                    {email && <> à <span className="font-medium text-gray-700">{email}</span></>}.
                    Clique dessus pour activer ton compte.
                </p>

                {showPasswordPrompt && !resent && (
                    <div className="space-y-2 text-left">
                        <label className="text-xs text-gray-500 font-medium">
                            Confirme ton mot de passe pour renvoyer l'email
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                            placeholder="••••••••"
                        />
                    </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
                {resent && <p className="text-sm text-green-600">✅ Email renvoyé !</p>}

                <Button variant="secondary" className="w-full" isLoading={resending} onClick={handleResend}>
                    Renvoyer l'email
                </Button>

                <Link to="/login" className="block text-sm text-[#FF4757] font-semibold hover:underline">
                    Retour à la connexion
                </Link>
            </div>
        </div>
    );
}

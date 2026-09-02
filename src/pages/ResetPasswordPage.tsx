// src/pages/ResetPasswordPage.tsx — Ça Parle
import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { account } from '@/api/appwrite';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!userId || !secret) {
            setError('Lien invalide ou expiré. Refais une demande de réinitialisation.');
            return;
        }
        if (password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Les deux mots de passe ne correspondent pas.');
            return;
        }

        setLoading(true);
        try {
            await account.updateRecovery(userId, secret, password);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err: any) {
            setError(err.message || 'Ce lien a peut-être expiré, refais une demande.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[#FF4757]">Ça Parle</h1>
                    <p className="text-sm text-gray-500 mt-1">Nouveau mot de passe</p>
                </div>

                {success ? (
                    <div className="text-center space-y-3">
                        <div className="text-4xl">✅</div>
                        <p className="text-sm text-gray-600">Mot de passe mis à jour ! Redirection vers la connexion...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Nouveau mot de passe"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimum 8 caractères"
                            required
                            minLength={8}
                        />
                        <Input
                            label="Confirme le mot de passe"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Retape le mot de passe"
                            required
                        />
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                                ❌ {error}
                            </div>
                        )}
                        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
                            Valider le nouveau mot de passe
                        </Button>
                        <div className="text-center text-sm">
                            <Link to="/login" className="text-[#FF4757] font-semibold hover:underline">
                                Retour à la connexion
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

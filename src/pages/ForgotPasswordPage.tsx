// src/pages/ForgotPasswordPage.tsx — Ça Parle
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { account } from '@/api/appwrite';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const redirectUrl = `${window.location.origin}/reset-password`;
            await account.createRecovery(email, redirectUrl);
            setSent(true);
        } catch (err: any) {
            // Message volontairement générique : ne pas révéler si l'email
            // existe ou non dans la base (évite l'énumération de comptes).
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[#FF4757]">Ça Parle</h1>
                    <p className="text-sm text-gray-500 mt-1">Mot de passe oublié</p>
                </div>

                {sent ? (
                    <div className="text-center space-y-4">
                        <div className="text-4xl">📧</div>
                        <p className="text-sm text-gray-600">
                            Si un compte existe avec cette adresse, un email vient de t'être envoyé avec un lien pour réinitialiser ton mot de passe.
                        </p>
                        <Link to="/login" className="text-[#FF4757] font-semibold hover:underline text-sm">
                            Retour à la connexion
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <p className="text-sm text-gray-500">
                            Entre l'adresse email de ton compte, on t'enverra un lien pour choisir un nouveau mot de passe.
                        </p>
                        <Input
                            label="Adresse email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ton@email.com"
                            required
                        />
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                                ❌ {error}
                            </div>
                        )}
                        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
                            Envoyer le lien
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

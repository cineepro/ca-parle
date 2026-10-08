// src/features/auth/components/LoginForm.tsx — Vanessa
import { useState } from 'react';
import { useLogin } from '../hooks/useLogin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { authService } from '@/features/auth/services/authService';
import { GoogleIcon } from './GoogleIcon';
import { XCircle } from 'lucide-react';

export const LoginForm = () => {
    const { login, loading, error } = useLogin();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login(email, password);
    };

    const handleGoogle = () => {
        // Redirige vers Google puis revient sur /accueil — pas d'email à
        // vérifier, Google a déjà confirmé l'adresse. On ne revient jamais
        // de cet appel (redirection de page complète), donc le
        // chargement reste affiché jusqu'au départ effectif.
        setGoogleLoading(true);
        authService.loginWithGoogle();
    };

    return (
        <div className="space-y-5">
            <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 min-h-[48px] border border-gray-300 rounded-full py-3 font-display text-base font-semibold text-ink hover:bg-sand transition-colors disabled:opacity-60"
            >
                <GoogleIcon />
                {googleLoading ? 'Redirection...' : 'Continuer avec Google'}
            </button>

            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-gray-600">ou avec ton email</span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                    label="Adresse email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    required
                />
                <div>
                    <Input
                        label="Mot de passe"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                    <div className="flex justify-end mt-2">
                        <Link to="/forgot-password" className="text-sm text-ochre hover:underline font-medium">
                            Mot de passe oublié ?
                        </Link>
                    </div>
                </div>

                {error && (
                    <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                        <XCircle className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> {error}
                    </div>
                )}

                <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
                    Se connecter
                </Button>

                <div className="text-center text-sm">
                    Pas encore de compte ?{' '}
                    <Link to="/register" className="text-ochre font-semibold hover:underline">
                        Créer un compte
                    </Link>
                </div>
            </form>
        </div>
    );
};

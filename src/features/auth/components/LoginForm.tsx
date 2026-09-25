// src/features/auth/components/LoginForm.tsx — Vanessa
import { useState } from 'react';
import { useLogin } from '../hooks/useLogin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const LoginForm = () => {
    const { login, loading, error } = useLogin();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login(email, password);
    };

    return (
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
                    <Link to="/forgot-password" className="text-sm text-[#FF4757] hover:underline font-medium">
                        Mot de passe oublié ?
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                    ❌ {error}
                </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
                Se connecter
            </Button>

            <div className="text-center text-sm">
                Pas encore de compte ?{' '}
                <Link to="/register" className="text-[#FF4757] font-semibold hover:underline">
                    Créer un compte
                </Link>
            </div>
        </form>
    );
};

// src/features/auth/hooks/useLogin.ts — Vanessa
import { useState } from 'react';
import { authService } from '../services/authService';
import { useAuthStore } from '@/store/authStore';

export const useLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setUser } = useAuthStore();

    const login = async (email: string, password: string) => {
        setLoading(true);
        setError(null);

        try {
            // Toute tentative de connexion repasse systématiquement par
            // authService.login(), seule fonction habilitée à décider si
            // l'email est vérifié et si la session doit être conservée.
            await authService.login(email, password);

            const user = await authService.getCurrentUserProfile();
            if (!user) {
                setError('Connexion impossible. Réessaie.');
                return;
            }

            setUser(user);
            window.location.href = '/accueil';
        } catch (err: any) {
            if (err?.message === 'EMAIL_NOT_VERIFIED') {
                window.location.href = '/verify-email';
                return;
            }
            if (err?.message?.includes('Invalid credentials') || err?.code === 401) {
                setError('Email ou mot de passe incorrect');
                return;
            }
            setError(err.message || 'Email ou mot de passe incorrect');
        } finally {
            setLoading(false);
        }
    };

    return { login, loading, error };
};

// src/features/auth/hooks/useAuth.ts — Vanessa
import { useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { useAuthStore } from '@/store/authStore';
import type { UserProfile } from '@/api/auth';

interface UseAuthReturn {
    user: UserProfile | null;
    loading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
    const { setUser, logout: storeLogout, refresh: storeRefresh } = useAuthStore();
    const [user, setLocalUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        try {
            // getCurrentUserProfile() renvoie null si pas de session OU si
            // l'email n'est pas vérifié.
            const currentUser = await authService.getCurrentUserProfile();
            setLocalUser(currentUser);
            setIsAuthenticated(!!currentUser);
            setUser(currentUser);
        } catch {
            setLocalUser(null);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [setUser]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const logout = useCallback(async () => {
        await storeLogout();
        setLocalUser(null);
        setIsAuthenticated(false);
    }, [storeLogout]);

    const refresh = useCallback(async () => {
        await storeRefresh();
        await checkAuth();
    }, [storeRefresh, checkAuth]);

    return { user, loading, isAuthenticated, logout, refresh };
};

// src/store/authStore.ts — Ça Parle
// isAuthenticated est strictement lié à emailVerification === true.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { account } from '@/api/appwrite';
import type { UserProfile } from '@/api/auth';

interface AuthState {
    user: UserProfile | null;
    isAuthenticated: boolean;
    loading: boolean;
    setUser: (user: UserProfile | null) => void;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            loading: true,

            setUser: (user) =>
                set({
                    user,
                    isAuthenticated: !!user && user.emailVerification === true,
                    loading: false,
                }),

            logout: async () => {
                try {
                    const { authService } = await import('@/features/auth/services/authService');
                    await authService.logout();
                } catch (error) {
                    console.warn('Logout warning:', error);
                } finally {
                    set({ user: null, isAuthenticated: false, loading: false });
                    window.location.href = '/login';
                }
            },

            refresh: async () => {
                set({ loading: true });
                try {
                    const currentUser = await account.get();
                    set({
                        user: currentUser as any,
                        isAuthenticated: currentUser.emailVerification === true,
                        loading: false,
                    });
                } catch {
                    set({ user: null, isAuthenticated: false, loading: false });
                }
            },
        }),
        {
            name: 'ca-parle-auth-storage',
            partialize: (state) => ({ user: state.user }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.loading = true;
                    state.isAuthenticated = false;
                }
            },
        }
    )
);
// src/router/ModeratorRoute.tsx — Ça Parle
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const ModeratorRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <svg className="animate-spin w-8 h-8 text-[#FF4757]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // isModerator ne peut être coché que depuis la console Appwrite ou une
    // Function admin (jamais depuis un formulaire client) — voir UserProfile.
    if (!user.isModerator) {
        return <Navigate to="/accueil" replace />;
    }

    return <>{children}</>;
};
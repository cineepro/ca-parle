// src/router/ResponderRoute.tsx — HALTE
// Réservé à la cellule d'écoute (isResponder). La Function vérifie de nouveau côté serveur.
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';

export const ResponderRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Chargement...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (!user.isResponder) return <Navigate to="/accueil" replace />;
    return <AppLayout>{children}</AppLayout>;
};

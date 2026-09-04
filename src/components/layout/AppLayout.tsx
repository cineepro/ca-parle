// src/components/layout/AppLayout.tsx — Ça Parle
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { CookieConsentBanner } from '@/features/onboarding/components/CookieConsentBanner';
import { CommunityRulesModal } from '@/features/onboarding/components/CommunityRulesModal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { initPushNotifications } from '@/features/notifications/services/pushService';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Enregistrement du jeton push — un seul point d'entrée pour toute
    // l'app (AppLayout enveloppe toutes les pages authentifiées), pour
    // éviter d'enregistrer plusieurs fois les écouteurs si ce hook était
    // appelé depuis plusieurs composants différents.
    useEffect(() => {
        if (user?.$id) {
            initPushNotifications(user.$id, (url) => navigate(url));
        }
    }, [user?.$id, navigate]);

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNav />
            {/* pb-24 sur mobile pour laisser la place à BottomNav (fixed) ;
                pas de padding supplémentaire sur desktop où elle est cachée. */}
            <main className="pb-24 md:pb-6">{children}</main>
            <BottomNav />
            <CommunityRulesModal />
            <CookieConsentBanner />
        </div>
    );
};
// src/components/layout/AppLayout.tsx — Ça Parle
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { CookieConsentBanner } from '@/features/onboarding/components/CookieConsentBanner';
import { CommunityRulesModal } from '@/features/onboarding/components/CommunityRulesModal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { initPushNotifications } from '@/features/notifications/services/pushService';
import { geolocationService } from '@/services/geolocationService';

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

    // Demande la permission de localisation dès l'entrée dans l'app — sur
    // Android, ça déclenche le vrai dialogue système natif (comme pour les
    // notifications ci-dessus), plutôt que d'attendre que l'utilisateur
    // tombe sur la carte Ça sert et découvre que ça ne marche pas.
    useEffect(() => {
        if (user?.$id) {
            geolocationService.requestPermission();
        }
    }, [user?.$id]);

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
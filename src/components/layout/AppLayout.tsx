// src/components/layout/AppLayout.tsx — Ça Parle
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { CookieConsentBanner } from '@/features/onboarding/components/CookieConsentBanner';
import { CommunityRulesModal } from '@/features/onboarding/components/CommunityRulesModal';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
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

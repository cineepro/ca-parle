// src/components/layout/BottomNav.tsx — Vanessa
// Visible uniquement sur mobile (md:hidden) — sur desktop, TopNav suffit.
import { Link, useLocation } from 'react-router-dom';

const TABS = [
    { to: '/accueil', label: 'Vanessa' },
    { to: '/ca-parle', label: 'Ça Parle' },
    { to: '/ca-sert', label: 'Ça sert' },
    { to: '/messages', label: 'Messages' },
    { to: '/profil', label: 'Profil' },
];

export const BottomNav = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="flex items-center justify-around px-1 py-2">
                {TABS.map((tab) => (
                    <Link
                        key={tab.to}
                        to={tab.to}
                        className={`flex-1 text-center py-1 text-[11px] font-semibold ${
                            isActive(tab.to) ? 'text-[#FF4757]' : 'text-gray-400'
                        }`}
                    >
                        {tab.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
};

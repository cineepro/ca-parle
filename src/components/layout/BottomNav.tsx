// src/components/layout/BottomNav.tsx — Ça Parle
// Visible uniquement sur mobile (md:hidden) — sur desktop, TopNav suffit.
import { Link, useLocation } from 'react-router-dom';

const TABS = [
    { to: '/accueil', icon: '🏠', label: 'Accueil' },
    { to: '/ca-sert', icon: '🧰', label: 'Ça sert' },
    // Le bouton central flottant (Publier) est rendu séparément ci-dessous.
    { to: '/messages', icon: '💬', label: 'Messages' },
    { to: '/profil', icon: '👤', label: 'Profil' },
];

export const BottomNav = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="relative flex items-center justify-around px-2 py-2">
                {/* Deux premiers onglets */}
                {TABS.slice(0, 2).map((tab) => (
                    <Link
                        key={tab.to}
                        to={tab.to}
                        className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${
                            isActive(tab.to) ? 'text-[#FF4757]' : 'text-gray-400'
                        }`}
                    >
                        <span className="text-lg leading-none">{tab.icon}</span>
                        {tab.label}
                    </Link>
                ))}

                {/* Bouton flottant central : Publier */}
                <Link
                    to="/publier"
                    className="flex items-center justify-center w-14 h-14 bg-[#FF4757] text-white rounded-full text-2xl shadow-lg -mt-8 border-4 border-white"
                    aria-label="Publier une histoire"
                >
                    +
                </Link>

                {/* Deux derniers onglets */}
                {TABS.slice(2).map((tab) => (
                    <Link
                        key={tab.to}
                        to={tab.to}
                        className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${
                            isActive(tab.to) ? 'text-[#FF4757]' : 'text-gray-400'
                        }`}
                    >
                        <span className="text-lg leading-none">{tab.icon}</span>
                        {tab.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
};
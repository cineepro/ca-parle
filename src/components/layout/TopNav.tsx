// src/components/layout/TopNav.tsx — Vanessa
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

const DESKTOP_LINKS = [
    { to: '/ca-parle', label: 'Ça Parle' },
    { to: '/ca-sert', label: 'Ça sert' },
    { to: '/messages', label: 'Messages' },
];

export const TopNav = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
            <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                <Link to="/accueil" className="text-lg font-bold text-[#FF4757]">
                    Vanessa
                </Link>

                {/* Liens complets, desktop uniquement */}
                <nav className="hidden md:flex items-center gap-1">
                    {DESKTOP_LINKS.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                isActive(link.to) ? 'bg-[#FF4757]/10 text-[#FF4757]' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <Link to="/recherche" className="text-gray-500 hover:text-gray-700" title="Rechercher">
                        Rechercher
                    </Link>
                    <NotificationBell />

                    {/* Profil + modération + déconnexion, desktop uniquement
                        (sur mobile, Profil est déjà dans BottomNav et les
                        actions secondaires vivent sur la page profil). */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/profil" className="text-sm text-gray-500 hover:text-gray-700">
                            Profil
                        </Link>
                        {user?.isModerator && (
                            <Link to="/moderation" className="text-sm text-gray-500 hover:text-gray-700">
                                Modération
                            </Link>
                        )}
                        <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">
                            Déconnexion
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

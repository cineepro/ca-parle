// src/pages/HomePage.tsx — Ça Parle
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PhoneReminderBanner } from '@/features/auth/components/PhoneReminderBanner';
import { CategoryFilter } from '@/features/stories/components/CategoryFilter';
import { StoryFeed } from '@/features/stories/components/StoryFeed';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

export default function HomePage() {
    const { user, logout } = useAuth();
    const [category, setCategory] = useState('tout');

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-[#FF4757]">🔥 Ce qui se raconte maintenant</h1>
                        <p className="text-xs text-gray-400">Salut {user?.name || ''} 👋</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <Link to="/profil" className="text-sm text-gray-500 hover:text-gray-700">
                            👤 Profil
                        </Link>
                        {user?.isModerator && (
                            <Link to="/moderation" className="text-sm text-gray-500 hover:text-gray-700">
                                🛡️ Modération
                            </Link>
                        )}
                        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">
                            Déconnexion
                        </button>
                    </div>
                </div>

                <PhoneReminderBanner />

                <CategoryFilter selected={category} onSelect={setCategory} />

                <StoryFeed categorySlug={category} />

                {/* Bouton flottant de publication */}
                <Link
                    to="/publier"
                    className="fixed bottom-6 right-6 bg-[#FF4757] text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:bg-[#e63e4d] transition-all"
                    aria-label="Publier une histoire"
                >
                    +
                </Link>
            </div>
        </div>
    );
}
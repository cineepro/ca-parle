// src/pages/NotificationsPage.tsx — Ça Parle
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import type { AppNotification } from '@/features/notifications/services/notificationService';

const timeAgo = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} j`;
};

export default function NotificationsPage() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
    const navigate = useNavigate();

    const handleClick = async (n: AppNotification) => {
        if (!n.read) await markAsRead(n.$id);
        if (n.url) navigate(n.url);
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link to="/accueil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-xl font-bold text-gray-800">🔔 Notifications</h1>
                    {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-[#FF4757] font-medium ml-auto hover:underline">
                            Tout marquer comme lu
                        </button>
                    )}
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                ) : notifications.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 text-center text-gray-400">
                        <div className="text-3xl mb-2">🔕</div>
                        <p className="text-sm">Rien de nouveau pour l'instant.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl divide-y divide-gray-50 overflow-hidden">
                        {notifications.map((n) => (
                            <button
                                key={n.$id}
                                onClick={() => handleClick(n)}
                                className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-[#FF4757]/5' : ''}`}
                            >
                                <div className="flex items-start gap-2">
                                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#FF4757] mt-1.5 shrink-0" />}
                                    <div className="flex-1">
                                        <p className={`text-sm ${!n.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{n.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                                        <p className="text-[11px] text-gray-300 mt-1">{timeAgo(n.$createdAt)}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

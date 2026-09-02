// src/features/notifications/components/NotificationBell.tsx — Ça Parle
import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationBell = () => {
    const { unreadCount } = useNotifications();

    return (
        <Link to="/notifications" className="relative text-sm text-gray-500 hover:text-gray-700">
            🔔
            {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#FF4757] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
};

// src/components/ui/avatar.tsx — Ça Parle
import { VANESSA_USER_ID, VANESSA_AVATAR_URL } from '@/api/constants';

interface AvatarProps {
    name: string;
    userId?: string;
    avatarUrl?: string;
    sizeClass?: string; // ex: "w-9 h-9"
}

export const Avatar = ({ name, userId, avatarUrl, sizeClass = 'w-9 h-9' }: AvatarProps) => {
    // Vanessa a une vraie image, indépendamment de ce que contient son
    // document users — c'est un asset statique fixe de la plateforme.
    const resolvedUrl = userId === VANESSA_USER_ID ? VANESSA_AVATAR_URL : avatarUrl;

    if (resolvedUrl) {
        return (
            <img
                src={resolvedUrl}
                alt={name}
                className={`${sizeClass} rounded-full object-cover shrink-0`}
            />
        );
    }

    return (
        <div className={`${sizeClass} rounded-full bg-[#FF4757]/10 text-[#FF4757] flex items-center justify-center font-bold text-sm shrink-0`}>
            {name.charAt(0).toUpperCase() || '?'}
        </div>
    );
};
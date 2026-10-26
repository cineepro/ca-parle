// src/components/ui/avatar.tsx — Vanessa
import { VANESSA_USER_ID, VANESSA_AVATAR_URL } from '@/api/constants';
import { usePublicProfile } from '@/features/profile/hooks/usePublicProfile';

interface AvatarProps {
    name: string;
    userId?: string;
    avatarUrl?: string;
    sizeClass?: string; // ex: "w-9 h-9"
}

export const Avatar = ({ name, userId, avatarUrl, sizeClass = 'w-9 h-9' }: AvatarProps) => {
    // Sans photo fournie, on va chercher celle de la personne (lecture groupée
    // et gardée en mémoire) — les messages et les profils n'en portent pas.
    const profile = usePublicProfile(userId, !!avatarUrl);

    // Vanessa a une vraie image, indépendamment de ce que contient son
    // document users — c'est un asset statique fixe de la plateforme.
    const resolvedUrl = userId === VANESSA_USER_ID ? VANESSA_AVATAR_URL : (avatarUrl || profile?.avatarUrl);

    if (resolvedUrl) {
        return (
            <img
                src={resolvedUrl}
                alt={name}
                loading="lazy"
                className={`${sizeClass} rounded-full object-cover shrink-0`}
            />
        );
    }

    return (
        <div className={`${sizeClass} rounded-full bg-brand-tint text-ochre flex items-center justify-center font-display font-bold text-sm shrink-0`}>
            {name.charAt(0).toUpperCase() || '?'}
        </div>
    );
};

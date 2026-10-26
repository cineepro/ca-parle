// src/features/profile/components/UserName.tsx — Vanessa
// Affiche un nom, suivi du badge bleu si le compte est certifié. À utiliser
// partout où le nom d'une personne passe (jamais pour un message anonyme).
import { usePublicProfile } from '../hooks/usePublicProfile';
import { VerifiedBadge } from './VerifiedBadge';

interface UserNameProps {
    name: string;
    userId?: string;
    /** Badge déjà connu (ex. profil de la personne connectée) : évite une lecture. */
    certified?: boolean;
    className?: string;
}

export const UserName = ({ name, userId, certified, className = '' }: UserNameProps) => {
    const profile = usePublicProfile(userId, certified !== undefined);
    const isCertified = certified ?? profile?.isCertified ?? false;
    return (
        <span className={className}>
            {name}
            {isCertified && <>{' '}<VerifiedBadge /></>}
        </span>
    );
};

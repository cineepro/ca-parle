// src/features/profile/hooks/usePublicProfile.ts — Vanessa
import { useEffect, useState } from 'react';
import { peekPublicProfile, requestPublicProfile, subscribePublicProfiles, type PublicProfile } from '../services/publicProfileCache';
import { VANESSA_USER_ID } from '@/api/constants';

/** Photo et badge d'une personne, lus en groupe et gardés en mémoire. */
export function usePublicProfile(userId?: string, skip = false): PublicProfile | undefined {
    const active = !!userId && !skip && userId !== VANESSA_USER_ID;
    const [profile, setProfile] = useState<PublicProfile | undefined>(() => (active ? peekPublicProfile(userId) : undefined));

    useEffect(() => {
        if (!active || !userId) { setProfile(undefined); return; }
        let alive = true;
        setProfile(peekPublicProfile(userId));
        requestPublicProfile(userId).then((p) => { if (alive) setProfile(p); });
        const off = subscribePublicProfiles(() => {
            const p = peekPublicProfile(userId);
            if (alive && p) setProfile(p);
        });
        return () => { alive = false; off(); };
    }, [active, userId]);

    return profile;
}

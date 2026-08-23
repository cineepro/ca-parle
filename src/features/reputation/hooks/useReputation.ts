// src/features/reputation/hooks/useReputation.ts — Ça Parle
import { useState, useEffect, useCallback } from 'react';
import { reputationService, type ReputationStats } from '../services/reputationService';
import { badgeService, type BadgeDoc, type UserBadge } from '../services/badgeService';

export const useReputation = (userId: string | undefined) => {
    const [stats, setStats] = useState<ReputationStats | null>(null);
    const [catalog, setCatalog] = useState<BadgeDoc[]>([]);
    const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [statsResult, catalogResult, earnedResult] = await Promise.all([
                reputationService.getStats(userId),
                badgeService.getCatalog(),
                badgeService.getUserBadges(userId),
            ]);
            setStats(statsResult);
            setCatalog(catalogResult);
            setEarnedBadges(earnedResult);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    const earnedKeys = new Set(
        earnedBadges.map((ub) => catalog.find((b) => b.$id === ub.badgeId)?.key).filter(Boolean)
    );

    return { stats, catalog, earnedKeys, loading, refresh: load };
};

// Appelé après toute action qui affecte la réputation (publication,
// commentaire, résolution de prédiction) : recalcule le score et attribue
// les nouveaux badges mérités.
// Récupère les stats à jour directement recalculées par les Functions Appwrite serveur
export async function refreshReputation(userId: string) {
    return await reputationService.getStats(userId);
}
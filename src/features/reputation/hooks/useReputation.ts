// src/features/reputation/hooks/useReputation.ts — Vanessa
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

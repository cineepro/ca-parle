// src/features/reactions/hooks/useReactions.ts — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { reactionService, type ReactionType, type TargetType, type ReactionCounts } from '../services/reactionService';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const useReactions = (targetType: TargetType, targetId: string, initialCount = 0) => {
    const { user } = useAuth();
    const [counts, setCounts] = useState<ReactionCounts | null>(null);
    const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : initialCount;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [c, mine] = await Promise.all([
                reactionService.getCounts(targetType, targetId),
                user ? reactionService.getUserReaction(targetType, targetId, user.$id) : Promise.resolve(null),
            ]);
            setCounts(c);
            setUserReaction(mine?.reactionType || null);
        } catch {
            // Non bloquant : on garde l'affichage sans réactions détaillées.
        } finally {
            setLoading(false);
        }
    }, [targetType, targetId, user]);

    useEffect(() => {
        load();
    }, [load]);

    const react = async (type: ReactionType) => {
        if (!user || submitting) return;
        setSubmitting(true);
        try {
            await reactionService.react(targetType, targetId, user.$id, type);
            setUserReaction((prev) => (prev === type ? null : type));
            // La Function `on-reaction-write` recalcule reactionsCount côté
            // serveur ; ici on se contente de rafraîchir l'affichage local
            // (avec un léger délai pour laisser le trigger s'exécuter).
            setTimeout(load, 400);
        } finally {
            setSubmitting(false);
        }
    };

    return { counts, userReaction, total, loading, submitting, react };
};

// src/features/reactions/hooks/useReactions.ts — Ça Parle
import { useState, useEffect, useCallback } from 'react';
import { reactionService, type ReactionType, type TargetType, type ReactionCounts } from '../services/reactionService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';

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

        const wasSame = userReaction === type;
        try {
            await reactionService.react(targetType, targetId, user.$id, type);

            // Ajuste localement (optimiste) avant de recharger précisément.
            setUserReaction(wasSame ? null : type);
            await load();

            // Compteur dénormalisé sur la story (best-effort, non critique).
            if (targetType === 'story') {
                const collection = COLLECTIONS.STORIES;
                try {
                    const story = await databases.getDocument(DATABASE_ID, collection, targetId);
                    const newTotal = counts
                        ? Object.values(counts).reduce((a, b) => a + b, 0) + (wasSame ? -1 : userReaction ? 0 : 1)
                        : (story as any).reactionsCount;
                    await databases.updateDocument(DATABASE_ID, collection, targetId, {
                        reactionsCount: Math.max(0, newTotal),
                    });
                } catch {
                    // Non bloquant.
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    return { counts, userReaction, total, loading, submitting, react };
};
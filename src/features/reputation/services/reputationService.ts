// src/features/reputation/services/reputationService.ts — Vanessa
// Écriture (recalcul du score, incrémentation des compteurs) désormais
// gérée côté serveur par les Functions `on-story-created`,
// `on-comment-created` et `resolve-prediction`. Ce service ne fait plus
// que LIRE les stats déjà calculées par le serveur.
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';

export interface ReputationStats {
    storiesCount: number;
    revelationsCount: number;
    commentsCount: number;
    predictionsCorrect: number;
    predictionsTotal: number;
    reliabilityIndex: number;
    reputationScore: number;
    gossipLevel: number;
}

export const reputationService = {
    async getStats(userId: string): Promise<ReputationStats | null> {
        try {
            const user: any = await databases.getDocument(DATABASE_ID, COLLECTIONS.USERS, userId);
            return {
                storiesCount: user.storiesCount || 0,
                revelationsCount: user.revelationsCount || 0,
                commentsCount: user.commentsCount || 0,
                predictionsCorrect: user.predictionsCorrect || 0,
                predictionsTotal: user.predictionsTotal || 0,
                reliabilityIndex: user.reliabilityIndex ?? 50,
                reputationScore: user.reputationScore || 0,
                gossipLevel: user.gossipLevel || 1,
            };
        } catch {
            return null;
        }
    },
};

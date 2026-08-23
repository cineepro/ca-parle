// src/features/reputation/services/reputationService.ts — Ça Parle
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

    async incrementCounter(userId: string, field: 'commentsCount' | 'revelationsCount' | 'storiesCount'): Promise<void> {
        try {
            const userDoc: any = await databases.getDocument(DATABASE_ID, COLLECTIONS.USERS, userId);
            const currentValue = userDoc[field] || 0;
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, userId, {
                [field]: currentValue + 1,
            });
        } catch (error) {
            console.warn(`L'incrémentation de ${field} a échoué:`, error);
        }
    },

    // À ajouter dans l'objet reputationService de reputationService.ts :

// Alias pour la compatibilité : fait la même chose que getStats
    async recompute(userId: string): Promise<ReputationStats | null> {
        return await this.getStats(userId);
    },
};
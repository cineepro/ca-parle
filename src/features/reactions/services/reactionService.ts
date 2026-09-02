// src/features/reactions/services/reactionService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export type ReactionType = 'fire' | 'laugh' | 'shock' | 'true' | 'possible' | 'false';
export type TargetType = 'story' | 'comment';

export interface Reaction extends Models.Document {
    targetType: TargetType;
    targetId: string;
    userId: string;
    reactionType: ReactionType;
    createdAt: string;
}

export type ReactionCounts = Record<ReactionType, number>;

const emptyCounts = (): ReactionCounts => ({
    fire: 0, laugh: 0, shock: 0, true: 0, possible: 0, false: 0,
});

export const reactionService = {
    // Un seul document "reaction" par utilisateur/cible (contrainte DB
    // unique userId+targetId) : on crée si absent, on met à jour sinon.
    // Le compteur stories.reactionsCount n'est plus recalculé ici : c'est
    // la Function `on-reaction-write` (déclenchée sur create/update/delete
    // de cette collection) qui s'en charge côté serveur.
    async react(targetType: TargetType, targetId: string, userId: string, reactionType: ReactionType): Promise<void> {
        const existing = await this.getUserReaction(targetType, targetId, userId);

        if (existing) {
            if (existing.reactionType === reactionType) {
                // Cliquer à nouveau sur la même réaction = la retirer.
                await databases.deleteDocument(DATABASE_ID, COLLECTIONS.REACTIONS, existing.$id);
            } else {
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.REACTIONS, existing.$id, { reactionType });
            }
        } else {
            await databases.createDocument(DATABASE_ID, COLLECTIONS.REACTIONS, ID.unique(), {
                targetType, targetId, userId, reactionType,
                createdAt: new Date().toISOString(),
            });
        }
    },

    async getUserReaction(targetType: TargetType, targetId: string, userId: string): Promise<Reaction | null> {
        const result = await databases.listDocuments<Reaction>(DATABASE_ID, COLLECTIONS.REACTIONS, [
            Query.equal('targetType', targetType),
            Query.equal('targetId', targetId),
            Query.equal('userId', userId),
            Query.limit(1),
        ]);
        return result.documents[0] || null;
    },

    // Agrégation client-side (pas de groupBy natif Appwrite). Suffisant tant
    // que le volume de réactions par histoire reste raisonnable (quelques
    // centaines) — à migrer vers une Function/compteur dénormalisé si ça
    // explose.
    async getCounts(targetType: TargetType, targetId: string): Promise<ReactionCounts> {
        const counts = emptyCounts();
        let offset = 0;
        const pageSize = 100;
        let hasMore = true;

        while (hasMore) {
            const result = await databases.listDocuments<Reaction>(DATABASE_ID, COLLECTIONS.REACTIONS, [
                Query.equal('targetType', targetType),
                Query.equal('targetId', targetId),
                Query.limit(pageSize),
                Query.offset(offset),
            ]);
            result.documents.forEach((doc) => {
                counts[doc.reactionType] = (counts[doc.reactionType] || 0) + 1;
            });
            offset += pageSize;
            hasMore = result.documents.length === pageSize;
        }

        return counts;
    },
};

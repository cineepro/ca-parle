// src/features/reputation/services/badgeService.ts — Ça Parle
// L'attribution des badges (checkAndAward) est désormais gérée côté
// serveur par les Functions `on-story-created`, `on-comment-created` et
// `resolve-prediction`. Ce service ne fait plus que LIRE le catalogue et
// les badges déjà obtenus.
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { Query } from 'appwrite';
import type { Models } from 'appwrite';

export interface BadgeDoc extends Models.Document {
    key: string;
    name: string;
    description: string;
    icon: string;
    criteria?: string;
}

export interface UserBadge extends Models.Document {
    userId: string;
    badgeId: string;
    earnedAt: string;
}

export const badgeService = {
    async getCatalog(): Promise<BadgeDoc[]> {
        const result = await databases.listDocuments<BadgeDoc>(DATABASE_ID, COLLECTIONS.BADGES, [Query.limit(100)]);
        return result.documents;
    },

    async getUserBadges(userId: string): Promise<UserBadge[]> {
        const result = await databases.listDocuments<UserBadge>(DATABASE_ID, COLLECTIONS.USER_BADGES, [
            Query.equal('userId', userId),
            Query.limit(100),
        ]);
        return result.documents;
    },
};
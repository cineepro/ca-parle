// src/features/follow/services/followService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export type FollowingType = 'user' | 'reference';

export interface Follow extends Models.Document {
    followerId: string;
    followingId: string;
    followingType: FollowingType;
}

export const followService = {
    async isFollowing(followerId: string, followingId: string, followingType: FollowingType): Promise<Follow | null> {
        const result = await databases.listDocuments<Follow>(DATABASE_ID, COLLECTIONS.FOLLOWS, [
            Query.equal('followerId', followerId),
            Query.equal('followingId', followingId),
            Query.equal('followingType', followingType),
            Query.limit(1),
        ]);
        return result.documents[0] || null;
    },

    async follow(followerId: string, followingId: string, followingType: FollowingType): Promise<void> {
        const existing = await this.isFollowing(followerId, followingId, followingType);
        if (existing) return;
        await databases.createDocument(DATABASE_ID, COLLECTIONS.FOLLOWS, ID.unique(), {
            followerId, followingId, followingType,
            createdAt: new Date().toISOString(),
        });
    },

    async unfollow(followerId: string, followingId: string, followingType: FollowingType): Promise<void> {
        const existing = await this.isFollowing(followerId, followingId, followingType);
        if (existing) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.FOLLOWS, existing.$id);
        }
    },

    async getFollowerCount(followingId: string, followingType: FollowingType): Promise<number> {
        const result = await databases.listDocuments<Follow>(DATABASE_ID, COLLECTIONS.FOLLOWS, [
            Query.equal('followingId', followingId),
            Query.equal('followingType', followingType),
            Query.limit(1),
        ]);
        return result.total;
    },

    // Liste tout ce qu'un utilisateur suit d'un type donné (ex: toutes ses
    // références suivies) — utilisé par la page "Mes références".
    async getFollowing(followerId: string, followingType: FollowingType, limit = 100): Promise<Follow[]> {
        const result = await databases.listDocuments<Follow>(DATABASE_ID, COLLECTIONS.FOLLOWS, [
            Query.equal('followerId', followerId),
            Query.equal('followingType', followingType),
            Query.limit(limit),
        ]);
        return result.documents;
    },
};

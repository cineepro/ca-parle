// src/api/database.ts — Ça Parle
import { databases } from './appwrite';
import { DATABASE_ID, COLLECTIONS } from './constants';
import { Query } from 'appwrite';
import type { Models } from 'appwrite';

// ➕ 1. AJOUT : Interface pour le type de document User
export interface UserProfile extends Models.Document {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    followers: number;
    following: number;
    isVerified: boolean;
    isCreative: boolean;
    balance: number;
    bio?: string;
    gossipLevel: number;
    reputationScore: number;
    reliabilityIndex: number;
    storiesCount: number;
    revelationsCount: number;
    commentsCount: number;
    predictionsCorrect: number;
    predictionsTotal: number;
    defaultAnonymous: boolean;
    isModerator: boolean;
    isBanned: boolean;
    createdAt: string;
}

export const dbService = {
    async createUserProfile(data: {
        userId: string;
        name: string;
        email: string;
        createdAt: string;
        phone?: string;
    }) {
        return await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.USERS,
            data.userId,
            {
                userId: data.userId,
                name: data.name,
                email: data.email,
                phone: data.phone || '',
                avatarUrl: '',
                followers: 0,
                following: 0,
                isVerified: false,
                isCreative: false,
                balance: 0,
                bio: '',
                gossipLevel: 1,
                reputationScore: 0,
                reliabilityIndex: 50,
                storiesCount: 0,
                revelationsCount: 0,
                commentsCount: 0,
                predictionsCorrect: 0,
                predictionsTotal: 0,
                defaultAnonymous: false,
                isModerator: false,
                isBanned: false,
                createdAt: data.createdAt,
            }
        );
    },

    async getUserProfile(userId: string) {
        return await databases.getDocument<UserProfile>(DATABASE_ID, COLLECTIONS.USERS, userId);
    },

    async updateUserPhone(userId: string, phone: string): Promise<void> {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, userId, { phone });
    },

    // ✏️ 2. REMPLACEMENT : Méthode searchUsers typée
    async searchUsers(query: string, excludeUserId?: string, limit = 10): Promise<UserProfile[]> {
        if (!query.trim()) return [];
        const result = await databases.listDocuments<UserProfile>(DATABASE_ID, COLLECTIONS.USERS, [
            Query.search('name', query),
            Query.limit(limit),
        ]);
        return result.documents.filter((u) => u.$id !== excludeUserId && !u.isBanned);
    },
};
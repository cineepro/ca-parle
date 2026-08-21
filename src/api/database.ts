// src/api/database.ts — Ça Parle
import { databases } from './appwrite';
import { DATABASE_ID, COLLECTIONS } from './auth';

export const dbService = {
    // Crée le document "users" — appelé uniquement après vérification
    // d'email réussie (voir authService.login), exactement comme sur
    // Kinema+. Le champ `phone` est optionnel : on ne le passe que s'il a
    // été saisi au moment de l'inscription.
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
                // Champs Ça Parle
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
        return await databases.getDocument(DATABASE_ID, COLLECTIONS.USERS, userId);
    },

    // Utilisé par la bannière de rappel pour les anciens comptes Kinema+
    // qui n'ont pas encore renseigné leur numéro.
    async updateUserPhone(userId: string, phone: string): Promise<void> {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, userId, { phone });
    },
};
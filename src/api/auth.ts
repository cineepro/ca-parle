// src/api/auth.ts — Ça Parle
// Reprend le modèle Kinema+ : la collection USERS est PARTAGÉE entre les
// deux plateformes. On y ajoute simplement de nouveaux attributs optionnels
// (phone, gossipLevel, reliabilityIndex, etc.) — voir database.ts.
import { account } from './appwrite';
import { OAuthProvider } from 'appwrite';
import type { Models } from 'appwrite';

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';

export const COLLECTIONS = {
    USERS: import.meta.env.VITE_APPWRITE_COLLECTION_USERS || '',
    STORIES: import.meta.env.VITE_APPWRITE_COLLECTION_STORIES || '',
    STORY_UPDATES: import.meta.env.VITE_APPWRITE_COLLECTION_STORY_UPDATES || '',
    COMMENTS: import.meta.env.VITE_APPWRITE_COLLECTION_COMMENTS || '',
    REACTIONS: import.meta.env.VITE_APPWRITE_COLLECTION_REACTIONS || '',
    PREDICTIONS: import.meta.env.VITE_APPWRITE_COLLECTION_PREDICTIONS || '',
    PREDICTION_VOTES: import.meta.env.VITE_APPWRITE_COLLECTION_PREDICTION_VOTES || '',
    STORY_VERSIONS: import.meta.env.VITE_APPWRITE_COLLECTION_STORY_VERSIONS || '',
    VERSION_VOTES: import.meta.env.VITE_APPWRITE_COLLECTION_VERSION_VOTES || '',
    REFERENCES: import.meta.env.VITE_APPWRITE_COLLECTION_REFERENCES || '',
    STORY_REFERENCES: import.meta.env.VITE_APPWRITE_COLLECTION_STORY_REFERENCES || '',
    FOLLOWS: import.meta.env.VITE_APPWRITE_COLLECTION_FOLLOWS || '',
    NOTIFICATIONS: import.meta.env.VITE_APPWRITE_COLLECTION_NOTIFICATIONS || '',
    REPORTS: import.meta.env.VITE_APPWRITE_COLLECTION_REPORTS || '',
    BADGES: import.meta.env.VITE_APPWRITE_COLLECTION_BADGES || '',
    USER_BADGES: import.meta.env.VITE_APPWRITE_COLLECTION_USER_BADGES || '',
    CATEGORIES: import.meta.env.VITE_APPWRITE_COLLECTION_CATEGORIES || '',
} as const;

// Champs du document "users" (collection PARTAGÉE avec Kinema+).
// Les champs historiques Kinema+ sont conservés tels quels ; les champs
// propres à Ça Parle sont marqués ci-dessous.
export interface UserProfile extends Models.User<Models.Preferences> {
    name: string;
    email: string;
    avatarUrl?: string;
    followers?: number;
    following?: number;
    isVerified?: boolean;
    balance?: number;
    isMerchant?: boolean;
    isCreative?: boolean;

    // ── Ça Parle ──
    phone?: string;
    bio?: string;
    pseudo?: string;
    gossipLevel?: number;
    reputationScore?: number;
    reliabilityIndex?: number;
    storiesCount?: number;
    revelationsCount?: number;
    commentsCount?: number;
    predictionsCorrect?: number;
    predictionsTotal?: number;
    defaultAnonymous?: boolean;
    isModerator?: boolean;
    isBanned?: boolean;
}

export const authService = {
    async register(email: string, password: string, name: string) {
        return await account.create('unique()', email, password, name);
    },

    async login(email: string, password: string) {
        return await account.createEmailPasswordSession(email, password);
    },

    async loginWithGoogle() {
        return await account.createOAuth2Session(
            OAuthProvider.Google,
            `${window.location.origin}/accueil`,
            `${window.location.origin}/login`
        );
    },

    async logout() {
        return await account.deleteSession('current');
    },

    async getCurrentUser(): Promise<UserProfile | null> {
        try {
            return await account.get() as UserProfile;
        } catch {
            return null;
        }
    },
};
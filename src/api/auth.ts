// src/api/auth.ts — Ça Parle
// Reprend le modèle Kinema+ : la collection USERS est PARTAGÉE entre les
// deux plateformes. On y ajoute simplement de nouveaux attributs optionnels
// (phone, gossipLevel, reliabilityIndex, etc.) — voir database.ts.
//
// Les IDs de base de données/collections vivent désormais dans
// constants.ts (une seule source de vérité, pas seulement pour l'auth).
// Ré-exportés ici pour ne pas casser les imports existants dans le reste
// du code (`import { DATABASE_ID, COLLECTIONS } from '@/api/auth'`).
import { account } from './appwrite';
import { OAuthProvider } from 'appwrite';
import type { Models } from 'appwrite';

export { DATABASE_ID, COLLECTIONS, FUNCTIONS } from './constants';

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
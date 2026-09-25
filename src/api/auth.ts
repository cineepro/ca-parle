// src/api/auth.ts — Vanessa
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
    // phone est déjà déclaré (string, requis) dans Models.User — pas besoin
    // de le redéclarer ici.
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

    // createOAuth2Session dépendait d'un cookie posé sur le domaine
    // d'Appwrite (fra.cloud.appwrite.io), différent de kinemaplus.com —
    // les navigateurs qui bloquent les cookies tiers (Firefox par défaut,
    // Safari) empêchent alors la session de survivre à la redirection : le
    // compte Google se crée bien côté Appwrite, mais sans session valide
    // côté app. createOAuth2Token évite complètement ce problème : au
    // retour, l'app reçoit un identifiant + secret dans l'URL et crée
    // elle-même la session sur SON propre domaine (voir OAuthCallbackPage).
    async loginWithGoogle() {
        return await account.createOAuth2Token(
            OAuthProvider.Google,
            `${window.location.origin}/oauth-callback`,
            `${window.location.origin}/login`
        );
    },

    async completeOAuthSession(userId: string, secret: string) {
        return await account.createSession(userId, secret);
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
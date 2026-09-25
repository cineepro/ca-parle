// src/features/auth/services/authService.ts — Vanessa
// Reprend le flux Kinema+ (éprouvé) :
//   1. Un compte non vérifié n'a JAMAIS de session valide ni de profil
//      applicatif accessible.
//   2. Le profil "users" n'est créé QU'APRÈS vérification de l'email.
//   3. Le téléphone (optionnel) est transmis à la création du profil s'il
//      a été saisi à l'inscription.
import { authService as apiAuth } from '@/api/auth';
import { account } from '@/api/appwrite';
import { dbService } from '@/api/database';
import type { UserProfile } from '@/api/auth';

export const authService = {
    ...apiAuth,

    async getCurrentUserProfile(): Promise<UserProfile | null> {
        const authUser = await apiAuth.getCurrentUser();
        if (!authUser) return null;

        // Un compte non vérifié n'a pas de profil applicatif tant que son
        // email n'est pas confirmé.
        if (!authUser.emailVerification) {
            return null;
        }

        try {
            const dbProfile = await dbService.getUserProfile(authUser.$id);
            return {
                ...authUser,
                ...dbProfile,
                $id: authUser.$id,
                email: authUser.email,
                name: (dbProfile as any).name || authUser.name,
            } as UserProfile;
        } catch {
            // Le document DB n'existe pas encore (edge case) → objet Auth seul
            return authUser;
        }
    },

    async isAuthenticated(): Promise<boolean> {
        const user = await apiAuth.getCurrentUser();
        return !!user && !!user.emailVerification;
    },

    async loginForVerification(email: string, password: string) {
        return await account.createEmailPasswordSession(email, password);
    },

    /**
     * Connexion définitive. Ne retourne JAMAIS une session valide pour un
     * compte dont l'email n'est pas vérifié — la session est détruite
     * immédiatement dans ce cas et une erreur EMAIL_NOT_VERIFIED est levée.
     */
    async login(email: string, password: string) {
        const session = await account.createEmailPasswordSession(email, password);

        let currentUser;
        try {
            currentUser = await account.get();
        } catch (err) {
            try { await account.deleteSession('current'); } catch { /* silencieux */ }
            throw err;
        }

        if (!currentUser.emailVerification) {
            try {
                await account.deleteSession('current');
            } catch { /* silencieux */ }
            throw new Error('EMAIL_NOT_VERIFIED');
        }

        // Email vérifié → on s'assure que le profil DB existe (cas d'un
        // compte Kinema+ historique qui n'aurait jamais eu de document
        // "users" créé, par exemple).
        try {
            await dbService.getUserProfile(currentUser.$id);
        } catch {
            try {
                await dbService.createUserProfile({
                    userId: currentUser.$id,
                    name: currentUser.name,
                    email: currentUser.email,
                    createdAt: new Date().toISOString(),
                });
            } catch (createErr) {
                console.error('[authService.login] Impossible de créer le profil :', createErr);
            }
        }

        return session;
    },
};

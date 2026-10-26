// src/features/profile/services/profileService.ts — Vanessa
import { ID, Permission, Role } from 'appwrite';
import { storage } from '@/api/appwrite';
import { BUCKETS, FUNCTIONS } from '@/api/constants';
import { callFunction } from '@/api/functionsClient';
import { resizeAvatar } from '../lib/imageResize';
import { forgetPublicProfile, peekPublicProfile } from './publicProfileCache';

export const avatarUploadEnabled = () => !!BUCKETS.AVATARS && !!FUNCTIONS.MANAGE_PROFILE;

export const profileService = {
    /** Recadre, envoie la photo puis demande au serveur de l'enregistrer sur le profil. */
    async uploadAvatar(userId: string, original: File): Promise<string> {
        if (!avatarUploadEnabled()) throw new Error("L'envoi de photo n'est pas encore activé.");
        const file = await resizeAvatar(original);
        const created = await storage.createFile(BUCKETS.AVATARS, ID.unique(), file, [
            Permission.read(Role.any()),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
        ]);
        try {
            const r = await callFunction<{ avatarUrl: string }>(FUNCTIONS.MANAGE_PROFILE, { action: 'set_avatar', fileId: created.$id });
            forgetPublicProfile(userId, { avatarUrl: r.avatarUrl, isCertified: peekPublicProfile(userId)?.isCertified ?? false });
            return r.avatarUrl;
        } catch (err) {
            await storage.deleteFile(BUCKETS.AVATARS, created.$id).catch(() => {});
            throw err;
        }
    },

    async removeAvatar(userId: string): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_PROFILE, { action: 'remove_avatar' });
        forgetPublicProfile(userId, { avatarUrl: '', isCertified: peekPublicProfile(userId)?.isCertified ?? false });
    },
};

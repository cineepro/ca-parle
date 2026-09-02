// src/features/notifications/services/notificationService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export interface AppNotification extends Models.Document {
    userId: string;
    title: string;
    message: string;
    url?: string;
    read: boolean;
    createdAt: string;
}

export const notificationService = {
    async create(data: { userId: string; title: string; message: string; url?: string }): Promise<void> {
        // Best-effort : une notification ratée ne doit jamais faire échouer
        // l'action principale (commentaire, vote, etc.) qui la déclenche.
        try {
            await databases.createDocument(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, ID.unique(), {
                ...data,
                url: data.url || '',
                read: false,
                createdAt: new Date().toISOString(),
            });
        } catch {
            /* non bloquant */
        }
    },

    // Ne notifie jamais un utilisateur pour sa propre action.
    async notifyIfNotSelf(actorId: string, targetUserId: string, data: { title: string; message: string; url?: string }): Promise<void> {
        if (!targetUserId || actorId === targetUserId) return;
        await this.create({ userId: targetUserId, ...data });
    },

    async getByUser(userId: string, limit = 30): Promise<AppNotification[]> {
        const result = await databases.listDocuments<AppNotification>(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, [
            Query.equal('userId', userId),
            Query.orderDesc('createdAt'),
            Query.limit(limit),
        ]);
        return result.documents;
    },

    async getUnreadCount(userId: string): Promise<number> {
        const result = await databases.listDocuments<AppNotification>(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, [
            Query.equal('userId', userId),
            Query.equal('read', false),
            Query.limit(1),
        ]);
        return result.total;
    },

    async markRead(notificationId: string): Promise<void> {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, notificationId, { read: true });
    },

    async markAllRead(userId: string): Promise<void> {
        let offset = 0;
        const pageSize = 100;
        let hasMore = true;

        while (hasMore) {
            const result = await databases.listDocuments<AppNotification>(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, [
                Query.equal('userId', userId),
                Query.equal('read', false),
                Query.limit(pageSize),
                Query.offset(offset),
            ]);
            await Promise.allSettled(
                result.documents.map((n) => databases.updateDocument(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, n.$id, { read: true }))
            );
            offset += pageSize;
            hasMore = result.documents.length === pageSize;
        }
    },
};

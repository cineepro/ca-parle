// src/features/messaging/services/messageService.ts — Ça Parle
import { databases, client } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query, Permission, Role } from 'appwrite';
import type { Models } from 'appwrite';
import { conversationService, type Conversation } from './conversationService';

export interface Message extends Models.Document {
    conversationId: string;
    senderId: string;
    content: string;
    readBy?: string[];
    createdAt: string;
}

export const messageService = {
    // Permissions posées à la création : lecture pour tous les participants
    // de la conversation, modification réservée à l'expéditeur (utile plus
    // tard pour éditer/supprimer son propre message).
    async send(conversation: Conversation, senderId: string, content: string): Promise<Message> {
        const permissions = [
            ...conversation.participantIds.map((id) => Permission.read(Role.user(id))),
            Permission.update(Role.user(senderId)),
        ];

        const message = await databases.createDocument<Message>(
            DATABASE_ID,
            COLLECTIONS.MESSAGES,
            ID.unique(),
            {
                conversationId: conversation.$id,
                senderId,
                content,
                readBy: [senderId],
                createdAt: new Date().toISOString(),
            },
            permissions
        );

        await conversationService.updateLastMessage(conversation.$id, content, senderId);

        // Notifie l'autre (ou les autres, si groupe un jour) participant(s).
        try {
            const { notificationService } = await import('@/features/notifications/services/notificationService');
            const preview = content.length > 60 ? `${content.slice(0, 60)}…` : content;
            await Promise.allSettled(
                conversation.participantIds
                    .filter((id) => id !== senderId)
                    .map((id) =>
                        notificationService.create({
                            userId: id,
                            title: '💬 Nouveau message',
                            message: preview,
                            url: `/messages/${conversation.$id}`,
                        })
                    )
            );
        } catch { /* non bloquant */ }

        return message;
    },

    async getByConversation(conversationId: string, limit = 100): Promise<Message[]> {
        const result = await databases.listDocuments<Message>(DATABASE_ID, COLLECTIONS.MESSAGES, [
            Query.equal('conversationId', conversationId),
            Query.orderAsc('createdAt'),
            Query.limit(limit),
        ]);
        return result.documents;
    },

    // Abonnement Appwrite Realtime : contrairement aux notifications
    // (polling 30s, suffisant pour un badge), un fil de discussion a
    // vraiment besoin d'être instantané. Retourne une fonction de
    // désabonnement à appeler au démontage du composant.
    subscribeToConversation(conversationId: string, onMessage: (message: Message) => void): () => void {
        const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`;
        return client.subscribe(channel, (response: any) => {
            const isCreate = response.events?.some((e: string) => e.endsWith('.create'));
            if (!isCreate) return;
            const payload = response.payload as Message;
            if (payload.conversationId === conversationId) {
                onMessage(payload);
            }
        });
    },
};
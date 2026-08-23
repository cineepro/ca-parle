// src/features/messaging/services/conversationService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query, Permission, Role } from 'appwrite';
import type { Models } from 'appwrite';

export interface Conversation extends Models.Document {
    participantIds: string[];
    isGroup: boolean;
    directKey: string;
    lastMessage?: string;
    lastMessageAt?: string;
    lastMessageSenderId?: string;
    createdAt: string;
}

function buildDirectKey(userIdA: string, userIdB: string): string {
    return [userIdA, userIdB].sort().join('_');
}

export const conversationService = {
    async findOrCreateDirect(userIdA: string, userIdB: string): Promise<Conversation> {
        // 🛡️ Garde de sécurité : Empêche les appels avec des IDs invalides
        if (!userIdA || !userIdB) {
            throw new Error('Les identifiants des deux utilisateurs sont requis.');
        }

        const directKey = buildDirectKey(userIdA, userIdB);

        const existing = await databases.listDocuments<Conversation>(DATABASE_ID, COLLECTIONS.CONVERSATIONS, [
            Query.equal('directKey', directKey),
            Query.limit(1),
        ]);
        if (existing.documents.length > 0) return existing.documents[0];

        // 🛡️ Nettoyage des IDs pour garantir des permissions valides
        const validUserIds = [userIdA, userIdB].filter((id) => typeof id === 'string' && id.trim().length > 0);

        const permissions = validUserIds.flatMap((id) => [
            Permission.read(Role.user(id)),
            Permission.update(Role.user(id)),
        ]);

        return await databases.createDocument<Conversation>(
            DATABASE_ID,
            COLLECTIONS.CONVERSATIONS,
            ID.unique(),
            {
                participantIds: [userIdA, userIdB],
                isGroup: false,
                directKey,
                lastMessage: '',
                lastMessageAt: new Date().toISOString(),
                lastMessageSenderId: '',
                createdAt: new Date().toISOString(),
            },
            permissions
        );
    },

    async listForUser(userId: string): Promise<Conversation[]> {
        if (!userId) return [];
        const result = await databases.listDocuments<Conversation>(DATABASE_ID, COLLECTIONS.CONVERSATIONS, [
            Query.equal('participantIds', userId),
            Query.orderDesc('lastMessageAt'),
            Query.limit(50),
        ]);
        return result.documents;
    },

    async getById(conversationId: string): Promise<Conversation> {
        return await databases.getDocument<Conversation>(DATABASE_ID, COLLECTIONS.CONVERSATIONS, conversationId);
    },

    async updateLastMessage(conversationId: string, content: string, senderId: string): Promise<void> {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.CONVERSATIONS, conversationId, {
            lastMessage: content.length > 200 ? content.slice(0, 200) : content,
            lastMessageAt: new Date().toISOString(),
            lastMessageSenderId: senderId,
        });
    },

    getOtherParticipantId(conversation: Conversation, currentUserId: string): string | undefined {
        return conversation.participantIds.find((id) => id !== currentUserId);
    },
};
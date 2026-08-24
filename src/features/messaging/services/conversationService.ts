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
    // Retrouve la conversation existante entre deux personnes via
    // directKey, ou en crée une nouvelle. Les permissions du document sont
    // posées ICI, à la création : seuls les deux participants pourront
    // jamais lire ou modifier cette conversation, quoi que dise la
    // permission de la collection.
    async findOrCreateDirect(userIdA: string, userIdB: string): Promise<Conversation> {
        const directKey = buildDirectKey(userIdA, userIdB);

        const existing = await databases.listDocuments<Conversation>(DATABASE_ID, COLLECTIONS.CONVERSATIONS, [
            Query.equal('directKey', directKey),
            Query.limit(1),
        ]);
        if (existing.documents.length > 0) return existing.documents[0];

        const permissions = [userIdA, userIdB].flatMap((id) => [
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

    // Fonctionne même sans index dédié sur participantIds (Query.contains
    // est la requête correcte pour "ce tableau contient cette valeur" sur
    // un attribut array — Query.equal ne fonctionne PAS sur les attributs
    // array et renvoie une erreur 400 côté Appwrite).
    async listForUser(userId: string): Promise<Conversation[]> {
        const result = await databases.listDocuments<Conversation>(DATABASE_ID, COLLECTIONS.CONVERSATIONS, [
            Query.contains('participantIds', userId),
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
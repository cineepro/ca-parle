// src/features/messaging/services/conversationService.ts — Vanessa
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS, FUNCTIONS } from '@/api/auth';
import { Query } from 'appwrite';
import type { Models } from 'appwrite';
import { callFunction } from '@/api/functionsClient';

export interface Conversation extends Models.Document {
    participantIds: string[];
    isGroup: boolean;
    directKey: string;
    lastMessage?: string;
    lastMessageAt?: string;
    lastMessageSenderId?: string;
    vanessaConnectorId?: string;
    createdAt: string;
}

export const conversationService = {
    // Délégué à la Function serveur `start-conversation` : Appwrite
    // interdit à un client d'accorder une permission de lecture à un autre
    // utilisateur que lui-même, donc la création (qui doit rendre la
    // conversation lisible par les DEUX participants) ne peut pas se faire
    // directement depuis le navigateur.
    async findOrCreateDirect(_userIdA: string, otherUserId: string): Promise<Conversation> {
        const result = await callFunction<{ conversation: Conversation }>(FUNCTIONS.START_CONVERSATION, { otherUserId });
        return result.conversation;
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

    getOtherParticipantId(conversation: Conversation, currentUserId: string): string | undefined {
        return conversation.participantIds.find((id) => id !== currentUserId);
    },

    // Change le connecteur actif de Vanessa pour cette conversation
    // ('' pour revenir en mode général, sans connecteur).
    async setVanessaConnector(conversationId: string, connectorId: string): Promise<Conversation> {
        const result = await callFunction<{ conversation: Conversation }>(FUNCTIONS.SET_VANESSA_CONNECTOR, { conversationId, connectorId });
        return result.conversation;
    },
};
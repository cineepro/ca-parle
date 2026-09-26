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
    // Titre auto-généré (uniquement pour les conversations avec Vanessa,
    // dès le premier message) — vide pour les messages entre utilisateurs,
    // où le nom de l'autre personne suffit déjà à identifier le fil.
    title?: string;
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
    //
    // Pour Vanessa spécifiquement, reprend la conversation la PLUS
    // RÉCENTE parmi celles déjà existantes (voir createNewVanessaConversation
    // pour en ouvrir volontairement une toute neuve) — pour les messages
    // entre deux vraies personnes, il n'y en a de toute façon jamais
    // qu'une seule, ce comportement reste donc identique à avant.
    async findOrCreateDirect(_userIdA: string, otherUserId: string): Promise<Conversation> {
        const result = await callFunction<{ conversation: Conversation }>(FUNCTIONS.START_CONVERSATION, { otherUserId });
        return result.conversation;
    },

    // Ouvre une TOUTE NOUVELLE conversation avec Vanessa, une de plus,
    // plutôt que de reprendre l'existante — c'est ce qui permet d'avoir
    // plusieurs fils de discussion avec elle, un par sujet, comme sur les
    // grandes IA conversationnelles (Claude, ChatGPT...). Réservé à
    // Vanessa : n'a pas de sens pour une conversation entre deux personnes.
    async createNewVanessaConversation(vanessaUserId: string): Promise<Conversation> {
        const result = await callFunction<{ conversation: Conversation }>(FUNCTIONS.START_CONVERSATION, {
            otherUserId: vanessaUserId,
            forceNew: true,
        });
        return result.conversation;
    },

    // Toutes les conversations de cet utilisateur AVEC VANESSA
    // spécifiquement (il peut désormais y en avoir plusieurs) — réutilise
    // simplement listForUser, qui ramène déjà tout, trié par activité
    // récente ; filtré ici pour ne garder que celles où Vanessa participe.
    async listVanessaConversations(userId: string, vanessaUserId: string): Promise<Conversation[]> {
        const all = await this.listForUser(userId);
        return all.filter((c) => c.participantIds.includes(vanessaUserId));
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
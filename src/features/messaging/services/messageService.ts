// src/features/messaging/services/messageService.ts — Ça Parle
import { databases, client } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS, FUNCTIONS } from '@/api/auth';
import { Query } from 'appwrite';
import type { Models } from 'appwrite';
import { callFunction } from '@/api/functionsClient';
import type { Conversation } from './conversationService';

export interface Message extends Models.Document {
    conversationId: string;
    senderId: string;
    content: string;
    readBy?: string[];
    createdAt: string;
}

export const messageService = {
    // Délégué à la Function serveur `send-message` : le message doit être
    // lisible par TOUS les participants de la conversation, pas seulement
    // par l'expéditeur — même contrainte de permissions que pour
    // start-conversation, impossible à poser depuis le client.
    async send(conversation: Conversation, _senderId: string, content: string): Promise<Message> {
        const result = await callFunction<{ message: Message }>(FUNCTIONS.SEND_MESSAGE, {
            conversationId: conversation.$id,
            content,
        });
        return result.message;
    },

    async getByConversation(conversationId: string, limit = 100): Promise<Message[]> {
        const result = await databases.listDocuments<Message>(DATABASE_ID, COLLECTIONS.MESSAGES, [
            Query.equal('conversationId', conversationId),
            Query.orderAsc('createdAt'),
            Query.limit(limit),
        ]);
        return result.documents;
    },

    // ⚠️ TEST DE DIAGNOSTIC TEMPORAIRE — désactivé pour isoler si la
    // connexion WebSocket Realtime est ce qui déclenche le flag "Suspicious
    // Javascript code" d'urlquery. Le reste de la messagerie (lecture,
    // envoi) continue de fonctionner normalement ; seule la mise à jour
    // instantanée des messages est temporairement coupée (il faudra
    // rafraîchir la page pour voir un nouveau message). À RÉTABLIR une fois
    // le test conclusif — voir le code original en commentaire ci-dessous.
    subscribeToConversation(_conversationId: string, _onMessage: (message: Message) => void): () => void {
        return () => {};
        /* ORIGINAL — à restaurer après le test :
        const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`;
        return client.subscribe(channel, (response: any) => {
            const isCreate = response.events?.some((e: string) => e.endsWith('.create'));
            if (!isCreate) return;
            const payload = response.payload as Message;
            if (payload.conversationId === _conversationId) {
                _onMessage(payload);
            }
        });
        */
    },
};
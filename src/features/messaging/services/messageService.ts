// src/features/messaging/services/messageService.ts — Ça Parle
import { databases, client, storage } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS, FUNCTIONS } from '@/api/auth';
import { BUCKETS } from '@/api/constants';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';
import { callFunction } from '@/api/functionsClient';
import type { Conversation } from './conversationService';

export interface Message extends Models.Document {
    conversationId: string;
    senderId: string;
    content: string;
    type?: 'text' | 'audio' | 'image';
    audioFileId?: string;
    audioDuration?: number;
    imageFileId?: string;
    readBy?: string[];
    createdAt: string;
}

// Construit l'URL de lecture d'un fichier vocal.
export function getVoiceMessageUrl(fileId: string): string {
    return storage.getFileView(BUCKETS.VOICE_MESSAGES, fileId).toString();
}

// Construit l'URL d'affichage d'une image envoyée en messagerie (réutilise
// le bucket story-images, déjà configuré).
export function getChatImageUrl(fileId: string): string {
    return storage.getFileView(BUCKETS.STORY_IMAGES, fileId).toString();
}

// Upload direct depuis le client vers le bucket vocal (le bucket autorise
// Create pour role:member) — retourne l'ID du fichier.
export async function uploadVoiceMessage(blob: Blob): Promise<string> {
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
    const uploaded = await storage.createFile(BUCKETS.VOICE_MESSAGES, ID.unique(), file);
    return uploaded.$id;
}

// Upload direct d'une image de messagerie (destinée à être décrite par
// Vanessa, ou simplement partagée).
export async function uploadChatImage(file: File): Promise<string> {
    const uploaded = await storage.createFile(BUCKETS.STORY_IMAGES, ID.unique(), file);
    return uploaded.$id;
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

    // Envoi d'un message vocal : upload direct du fichier audio, puis la
    // Function se charge de la transcription et, si Vanessa est concernée,
    // de générer sa réponse (éventuellement elle aussi en voix).
    async sendVoice(conversation: Conversation, audioBlob: Blob, durationSeconds: number): Promise<Message> {
        const audioFileId = await uploadVoiceMessage(audioBlob);
        const result = await callFunction<{ message: Message }>(FUNCTIONS.SEND_MESSAGE, {
            conversationId: conversation.$id,
            audioFileId,
            audioDuration: Math.round(durationSeconds),
        });
        return result.message;
    },

    // Envoi d'une image : upload direct, puis la Function crée le message.
    // Elle ne déclenche JAMAIS de réponse automatique à elle seule — il
    // faut un message suivant qui demande explicitement une description.
    async sendImage(conversation: Conversation, file: File): Promise<Message> {
        const imageFileId = await uploadChatImage(file);
        const result = await callFunction<{ message: Message }>(FUNCTIONS.SEND_MESSAGE, {
            conversationId: conversation.$id,
            imageFileId,
        });
        return result.message;
    },

    // Charge les messages les plus RÉCENTS d'une conversation (comme
    // WhatsApp/Messenger : on n'affiche pas tout l'historique d'un coup).
    // Retourne dans l'ordre chronologique (plus ancien → plus récent) pour
    // l'affichage, même si la requête interne trie par date décroissante.
    async getRecentMessages(conversationId: string, limit = 30): Promise<Message[]> {
        const result = await databases.listDocuments<Message>(DATABASE_ID, COLLECTIONS.MESSAGES, [
            Query.equal('conversationId', conversationId),
            Query.orderDesc('createdAt'),
            Query.limit(limit),
        ]);
        return result.documents.reverse();
    },

    // Charge le lot de messages plus anciens que `beforeMessageId` (le plus
    // ancien actuellement affiché à l'écran). Utilisé par le bouton
    // "Charger les messages précédents" — jamais automatique, à la charge
    // de l'utilisateur, exactement comme demandé.
    async getOlderMessages(conversationId: string, beforeMessageId: string, limit = 30): Promise<Message[]> {
        const result = await databases.listDocuments<Message>(DATABASE_ID, COLLECTIONS.MESSAGES, [
            Query.equal('conversationId', conversationId),
            Query.orderDesc('createdAt'),
            Query.cursorAfter(beforeMessageId),
            Query.limit(limit),
        ]);
        return result.documents.reverse();
    },

    // Conservé pour compatibilité (utilisé nulle part d'autre pour
    // l'instant, mais évite de casser un appel existant).
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
// src/features/messaging/utils/receipts.ts — Vanessa
import type { Conversation } from '../services/conversationService';
import type { Message } from '../services/messageService';
import { VANESSA_USER_ID } from '@/api/constants';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';
export interface ReceiptMarks { d?: string; r?: string }

const time = (iso?: string) => (iso ? new Date(iso).getTime() : 0);

// Lecture sûre du JSON des accusés — jamais d'exception : une valeur
// absente ou abîmée donne simplement "aucun accusé".
export function parseReceipts(conversation?: Pick<Conversation, 'receipts'> | null): Record<string, ReceiptMarks> {
    if (!conversation?.receipts) return {};
    try {
        const parsed = JSON.parse(conversation.receipts);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

export const isVanessaConversation = (conversation?: Pick<Conversation, 'participantIds'> | null): boolean =>
    !!(VANESSA_USER_ID && conversation?.participantIds.includes(VANESSA_USER_ID));

// Statut d'un message que J'AI envoyé, vu par l'autre personne :
//   pending   : en cours d'envoi (horloge)
//   sent      : parti, pas encore reçu         ✓
//   delivered : reçu sur son appareil           ✓✓
//   read      : lu                              ✓✓ en couleur
// Repose sur les repères de la conversation (voir mark-receipts), comparés
// à l'heure du message — jamais sur un champ du message lui-même.
export function getMessageStatus(message: Message, conversation: Conversation | null, otherId?: string): MessageStatus {
    if (message.$id.startsWith('temp-')) return 'pending';
    return statusAt(message.$createdAt, conversation, otherId);
}

// Même calcul pour "mon dernier message" d'une conversation (liste).
export function statusAt(sentAtIso: string | undefined, conversation: Conversation | null, otherId?: string): MessageStatus {
    if (!otherId || !sentAtIso) return 'sent';
    const marks = parseReceipts(conversation)[otherId];
    if (!marks) return 'sent';
    const sentAt = time(sentAtIso);
    if (marks.r && time(marks.r) >= sentAt) return 'read';
    if (marks.d && time(marks.d) >= sentAt) return 'delivered';
    return 'sent';
}

// Repère de lecture LOCAL, propre à cet appareil : noté dès que j'ouvre la
// conversation, sans attendre le serveur. Il rend le point "non lu" instantané
// et empêche qu'il reste allumé à vie si l'accusé serveur n'arrive pas
// (configuration pas encore en place, réseau coupé...). Le repère serveur,
// lui, sert à synchroniser entre mes appareils et à informer l'autre personne.
const localKey = (myId: string, conversationId: string) => `lastRead:${myId}:${conversationId}`;

export function markReadLocally(myId: string, conversationId: string, iso: string = new Date().toISOString()): void {
    try { localStorage.setItem(localKey(myId, conversationId), iso); } catch { /* stockage indisponible : sans conséquence grave */ }
}
function readLocally(myId: string, conversationId: string): string | undefined {
    try { return localStorage.getItem(localKey(myId, conversationId)) || undefined; } catch { return undefined; }
}

function hasMessagesFromOther(conversation: Conversation, myId: string): boolean {
    if (isVanessaConversation(conversation)) return false; // pas d'accusés avec Vanessa
    if (!conversation.lastMessageAt || !conversation.lastMessageSenderId) return false;
    return conversation.lastMessageSenderId !== myId;
}

// Faut-il ENVOYER un accusé "lu" au serveur ? (repère serveur uniquement :
// c'est lui que l'autre personne voit.)
export function needsReadAck(conversation: Conversation, myId: string): boolean {
    return hasMessagesFromOther(conversation, myId)
        && time(conversation.lastMessageAt) > time(parseReceipts(conversation)[myId]?.r);
}

// Faut-il AFFICHER le point "non lu" ? (repère serveur OU local : le plus
// récent des deux fait foi.)
export function hasUnread(conversation: Conversation, myId: string): boolean {
    if (!hasMessagesFromOther(conversation, myId)) return false;
    const readAt = Math.max(time(parseReceipts(conversation)[myId]?.r), time(readLocally(myId, conversation.$id)));
    return time(conversation.lastMessageAt) > readAt;
}
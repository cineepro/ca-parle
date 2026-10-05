// src/features/messaging/services/receiptsService.ts — Vanessa
// Accusés de réception (✓ envoyé, ✓✓ reçu, ✓✓ lu) côté appareil.
//
// Deux événements seulement déclenchent un accusé, et toujours via la
// Function mark-receipts (le destinataire n'a pas le droit de modifier un
// message) :
//   - "reçu" : cet appareil vient de charger la liste des conversations, ou
//     un nouveau message arrive en temps réel pendant que l'appli est ouverte ;
//   - "lu"   : la conversation est ouverte, à l'écran, et un message arrive
//     (ou on vient de l'ouvrir / de revenir sur l'onglet).
// Les demandes sont groupées (1,2 s) et dédoublonnées : une rafale de
// messages ne produit qu'un appel. Les conversations avec Vanessa sont
// ignorées (elle n'a pas d'appareil).
import { client } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';
import { Query } from 'appwrite';
import type { Conversation } from './conversationService';
import { parseReceipts, isVanessaConversation } from '../utils/receipts';

type Kind = 'delivered' | 'read';
const DEBOUNCE_MS = 1200;

let myId = '';
let activeConversationId: string | null = null;
let knownIds: string[] = [];
let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const queues: Record<Kind, Set<string>> = { delivered: new Set(), read: new Set() };
// Dernier message déjà accusé, par conversation : évite de redemander le
// même accusé à chaque rechargement de la liste le temps que le serveur réponde.
const alreadyQueuedFor = new Map<string, string>();

const enabled = () => !!FUNCTIONS.MARK_RECEIPTS;
const time = (iso?: string) => (iso ? new Date(iso).getTime() : 0);

async function flush() {
    timer = null;
    const read = [...queues.read];
    const delivered = [...queues.delivered].filter((id) => !read.includes(id)); // "lu" implique "reçu"
    queues.read.clear();
    queues.delivered.clear();
    // Les échecs (ex : attribut `receipts` pas encore créé) sont volontairement
    // silencieux : des coches manquantes ne doivent jamais gêner la messagerie.
    if (read.length) await callFunction(FUNCTIONS.MARK_RECEIPTS, { conversationIds: read, kind: 'read' }).catch(() => {});
    if (delivered.length) await callFunction(FUNCTIONS.MARK_RECEIPTS, { conversationIds: delivered, kind: 'delivered' }).catch(() => {});
}

function schedule() {
    if (!timer) timer = setTimeout(flush, DEBOUNCE_MS);
}

export const receiptsService = {
    // La conversation actuellement ouverte ET visible : les messages qui y
    // arrivent sont "lus" tout de suite plutôt que simplement "reçus".
    setActiveConversation(id: string | null) {
        activeConversationId = id;
    },

    queueRead(conversationId: string) {
        if (!enabled() || !conversationId) return;
        queues.read.add(conversationId);
        schedule();
    },

    queueDelivered(conversationId: string) {
        if (!enabled() || !conversationId) return;
        queues.delivered.add(conversationId);
        schedule();
    },

    onConversationsLoaded(list: Conversation[], userId: string) {
        if (!enabled() || !userId) return;
        myId = userId;
        const human = list.filter((c) => !isVanessaConversation(c));

        // 1. Rattrapage : messages arrivés pendant que l'appli était fermée.
        for (const c of human) {
            if (!c.lastMessageSenderId || c.lastMessageSenderId === userId || !c.lastMessageAt) continue;
            if (time(c.lastMessageAt) <= time(parseReceipts(c)[userId]?.d)) continue;
            if (alreadyQueuedFor.get(c.$id) === c.lastMessageAt) continue;
            alreadyQueuedFor.set(c.$id, c.lastMessageAt);
            receiptsService.queueDelivered(c.$id);
        }

        // 2. Suivi en temps réel de toutes mes conversations entre personnes
        // (filtré côté serveur sur ces conversations uniquement).
        const ids = human.map((c) => c.$id).sort();
        if (ids.join(',') === knownIds.join(',')) return;
        knownIds = ids;
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        if (ids.length === 0) return;
        try {
            const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`;
            unsubscribe = client.subscribe(
                channel,
                (response: any) => {
                    if (!response.events?.some((e: string) => e.endsWith('.create'))) return;
                    const message = response.payload;
                    if (!message || message.senderId === myId) return;
                    const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
                    if (message.conversationId === activeConversationId && visible) receiptsService.queueRead(message.conversationId);
                    else receiptsService.queueDelivered(message.conversationId);
                },
                [Query.equal('conversationId', ids)]
            );
        } catch {
            /* le suivi temps réel est un confort : sans lui, le rattrapage à
               chaque chargement de liste continue de fonctionner */
        }
    },
};
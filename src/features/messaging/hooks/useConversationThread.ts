// src/features/messaging/hooks/useConversationThread.ts — Vanessa
import { useState, useEffect, useCallback, useRef } from 'react';
import { messageService, type Message } from '../services/messageService';
import { conversationService, type Conversation } from '../services/conversationService';
import { receiptsService } from '../services/receiptsService';
import { needsReadAck, markReadLocally } from '../utils/receipts';
import { getMessagePreview } from '../utils/messagePreview';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { dbService } from '@/api/database';
import { VANESSA_USER_ID } from '@/api/constants';

const PAGE_SIZE = 30;
// Si Vanessa ne répond pas dans ce délai (échec silencieux d'appel IA côté
// serveur, quota dépassé, etc.), on arrête d'afficher "elle écrit..." pour
// ne pas laisser l'indicateur tourner indéfiniment.
const VANESSA_TYPING_TIMEOUT_MS = 25_000;

function buildOptimisticMessage(
    conversationId: string,
    senderId: string,
    content: string,
    tempId: string,
    extra: Partial<Message> = {}
): Message {
    const nowIso = new Date().toISOString();
    return {
        $id: tempId,
        $collectionId: '', $databaseId: '', $permissions: [],
        $createdAt: nowIso, $updatedAt: nowIso,
        conversationId, senderId, content,
        type: 'text', readBy: [senderId], createdAt: nowIso,
        ...extra,
    } as unknown as Message;
}

// Citation d'un message pour l'affichage immédiat d'une réponse.
const replyJson = (target?: Message | null): Partial<Message> =>
    target
        ? { replyTo: JSON.stringify({ id: target.$id, senderId: target.senderId, type: target.type || 'text', preview: getMessagePreview(target) }) }
        : {};

export const useConversationThread = (conversationId: string) => {
    const { user } = useAuth();
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [otherName, setOtherName] = useState('Utilisateur');
    const [otherId, setOtherId] = useState<string | undefined>(undefined);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMoreOlder, setHasMoreOlder] = useState(false);
    const [sending, setSending] = useState(false);
    const [vanessaTyping, setVanessaTyping] = useState(false);
    // `error` : bloquant, remplace toute la page (conversation introuvable).
    // `sendError` : transitoire, affiché comme un simple message sans
    // cacher le reste de la conversation (échec d'envoi, quota dépassé...).
    const [error, setError] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const seenIds = useRef(new Set<string>());
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // File d'attente des messages optimistes envoyés par MOI, pas encore
    // confirmés par le serveur — nécessaire pour éviter un doublon si le
    // temps réel fait arriver la version confirmée AVANT que l'appel réseau
    // initial n'ait fini de répondre (déjà observé avec les réponses de
    // Vanessa, le même risque existe pour l'écho de mon propre message).
    const pendingTempIds = useRef<string[]>([]);

    // Toujours les dernières valeurs, pour les fonctions asynchrones et les
    // écouteurs qui survivent à un rendu.
    const messagesRef = useRef<Message[]>([]);
    messagesRef.current = messages;
    const hasMoreOlderRef = useRef(false);
    hasMoreOlderRef.current = hasMoreOlder;
    const conversationRef = useRef<Conversation | null>(null);
    conversationRef.current = conversation;

    const isVanessaConversation = !!(
        VANESSA_USER_ID && conversation?.participantIds.includes(VANESSA_USER_ID)
    );

    const clearTypingTimeout = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    };

    const startWaitingForVanessa = () => {
        if (!isVanessaConversation) return;
        setVanessaTyping(true);
        clearTypingTimeout();
        typingTimeoutRef.current = setTimeout(() => setVanessaTyping(false), VANESSA_TYPING_TIMEOUT_MS);
    };

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            // Ne charge que les PAGE_SIZE messages les plus récents au
            // départ — pas tout l'historique d'un coup (coûteux et inutile
            // sur une longue conversation). Les plus anciens se chargent
            // uniquement à la demande, via loadOlder().
            const [conv, msgs] = await Promise.all([
                conversationService.getById(conversationId),
                messageService.getRecentMessages(conversationId, PAGE_SIZE),
            ]);
            setConversation(conv);
            setMessages(msgs);
            seenIds.current = new Set(msgs.map((m) => m.$id));
            // S'il y a exactement PAGE_SIZE messages chargés, il y en a
            // probablement d'autres plus vieux à charger.
            setHasMoreOlder(msgs.length === PAGE_SIZE);

            const otherId = conversationService.getOtherParticipantId(conv, user.$id);
            if (otherId) {
                setOtherId(otherId);
                try {
                    const profile: any = await dbService.getUserProfile(otherId);
                    setOtherName(profile.name || 'Utilisateur');
                } catch { /* garde le nom par défaut */ }
            }
        } catch {
            setError('Cette conversation est introuvable.');
        } finally {
            setLoading(false);
        }
    }, [conversationId, user]);

    useEffect(() => {
        load();
    }, [load]);

    // Charge le lot de messages précédents (plus anciens), à la demande de
    // l'utilisateur uniquement — jamais automatique. Les nouveaux messages
    // sont ajoutés en TÊTE de liste (avant les messages déjà affichés).
    const loadOlder = useCallback(async () => {
        if (loadingOlder || !hasMoreOlder || messages.length === 0) return;
        setLoadingOlder(true);
        try {
            const oldestId = messages[0].$id;
            const older = await messageService.getOlderMessages(conversationId, oldestId, PAGE_SIZE);
            older.forEach((m) => seenIds.current.add(m.$id));
            setMessages((prev) => [...older, ...prev]);
            setHasMoreOlder(older.length === PAGE_SIZE);
        } catch {
            // Non bloquant — l'utilisateur peut réessayer.
        } finally {
            setLoadingOlder(false);
        }
    }, [conversationId, messages, loadingOlder, hasMoreOlder]);

    // Remonte l'historique jusqu'à retrouver un message précis (clic sur une
    // citation dont l'original est plus ancien que ce qui est affiché).
    // Plafonné : au-delà de ~300 messages, on abandonne plutôt que de lire
    // toute la conversation. Retourne true si le message est maintenant là.
    const loadOlderUntil = useCallback(async (targetId: string): Promise<boolean> => {
        if (messagesRef.current.some((m) => m.$id === targetId)) return true;
        let oldestId = messagesRef.current[0]?.$id;
        let more = hasMoreOlderRef.current;
        for (let page = 0; more && oldestId && page < 10; page++) {
            const older = await messageService.getOlderMessages(conversationId, oldestId, PAGE_SIZE);
            if (older.length === 0) break;
            older.forEach((m) => seenIds.current.add(m.$id));
            setMessages((prev) => [...older, ...prev]);
            more = older.length === PAGE_SIZE;
            setHasMoreOlder(more);
            if (older.some((m) => m.$id === targetId)) return true;
            oldestId = older[0].$id;
        }
        return false;
    }, [conversationId]);

    // Abonnement temps réel : tant que le composant est monté, tout nouveau
    // message de cette conversation apparaît immédiatement, sans recharger.
    useEffect(() => {
        const unsubscribe = messageService.subscribeToConversation(conversationId, (message) => {
            if (seenIds.current.has(message.$id)) return;
            seenIds.current.add(message.$id);

            // Si c'est l'écho de mon propre message optimiste (arrivé par
            // le temps réel avant que mon propre appel réseau n'ait fini),
            // on remplace le plus ancien message temporaire en attente au
            // lieu d'en ajouter un doublon.
            if (user && message.senderId === user.$id && pendingTempIds.current.length > 0) {
                const tempId = pendingTempIds.current.shift()!;
                setMessages((prev) => prev.map((m) => (m.$id === tempId ? message : m)));
                return;
            }

            setMessages((prev) => [...prev, message]);
            // Dès que le message de Vanessa arrive, on arrête "elle écrit...".
            if (VANESSA_USER_ID && message.senderId === VANESSA_USER_ID) {
                setVanessaTyping(false);
                clearTypingTimeout();
            }
        });
        return () => {
            unsubscribe();
            clearTypingTimeout();
        };
    }, [conversationId, user]);

    // Suit les mises à jour de CETTE conversation entre deux personnes : c'est
    // ainsi que les coches passent de ✓ à ✓✓ sans recharger. Inutile (et donc
    // non abonné) avec Vanessa : aucun accusé n'y existe.
    const hasConversation = !!conversation;
    useEffect(() => {
        if (!hasConversation || isVanessaConversation) return;
        return conversationService.subscribeToConversation(conversationId, (updated) => {
            setConversation((prev) => (prev ? { ...prev, ...updated } : prev));
        });
    }, [conversationId, hasConversation, isVanessaConversation]);

    // "Lu" : la conversation est ouverte ET visible. Les messages qui arrivent
    // ensuite sont marqués lus par receiptsService (conversation active).
    const myId = user?.$id;
    useEffect(() => {
        if (!hasConversation || !myId || isVanessaConversation) return;
        receiptsService.setActiveConversation(conversationId);
        const markIfNeeded = () => {
            const current = conversationRef.current;
            if (document.visibilityState !== 'visible') return;
            markReadLocally(myId, conversationId); // le point "non lu" s'éteint tout de suite
            if (current && needsReadAck(current, myId)) receiptsService.queueRead(conversationId);
        };
        markIfNeeded();
        document.addEventListener('visibilitychange', markIfNeeded);
        window.addEventListener('focus', markIfNeeded);
        return () => {
            receiptsService.setActiveConversation(null);
            document.removeEventListener('visibilitychange', markIfNeeded);
            window.removeEventListener('focus', markIfNeeded);
        };
    }, [conversationId, hasConversation, myId, isVanessaConversation]);

    // Tant que la conversation est ouverte et visible, tout ce qui y arrive
    // est lu : on tient le repère local à jour (point "non lu" de la liste).
    const lastMessageAt = conversation?.lastMessageAt;
    useEffect(() => {
        if (!hasConversation || !myId || isVanessaConversation) return;
        if (document.visibilityState === 'visible') markReadLocally(myId, conversationId);
    }, [conversationId, hasConversation, myId, isVanessaConversation, lastMessageAt, messages.length]);

    // Envoi avec affichage IMMÉDIAT : le message apparaît avant même l'appel
    // réseau (avec une horloge à la place des coches), puis est remplacé par
    // la version confirmée — par le temps réel ou par la réponse, selon ce
    // qui arrive en premier.
    const dispatch = async (
        optimistic: Message,
        send: () => Promise<Message>,
        failText: (err: any) => string,
        waitForVanessa: boolean
    ) => {
        setSending(true);
        setSendError(null);
        if (waitForVanessa) startWaitingForVanessa();
        pendingTempIds.current.push(optimistic.$id);
        setMessages((prev) => [...prev, optimistic]);
        try {
            const sent = await send();
            if (sent && pendingTempIds.current.includes(optimistic.$id)) {
                // Toujours en attente : le temps réel n'a pas encore
                // remplacé ce message temporaire, on le fait ici.
                pendingTempIds.current = pendingTempIds.current.filter((id) => id !== optimistic.$id);
                seenIds.current.add(sent.$id);
                setMessages((prev) => prev.map((m) => (m.$id === optimistic.$id ? sent : m)));
            }
        } catch (err: any) {
            pendingTempIds.current = pendingTempIds.current.filter((id) => id !== optimistic.$id);
            // Retire le message optimiste raté — sinon l'utilisateur croit
            // qu'il est parti alors que ce n'est pas le cas.
            setMessages((prev) => prev.filter((m) => m.$id !== optimistic.$id));
            setSendError(failText(err));
            setVanessaTyping(false);
            clearTypingTimeout();
        } finally {
            setSending(false);
        }
    };

    const sendMessage = async (content: string, replyTarget?: Message | null) => {
        if (!user || !conversation || !content.trim() || sending) return;
        const tempId = `temp-${Date.now()}`;
        await dispatch(
            buildOptimisticMessage(conversation.$id, user.$id, content.trim(), tempId, replyJson(replyTarget)),
            () => messageService.send(conversation, user.$id, content.trim(), replyTarget?.$id),
            () => "Impossible d'envoyer le message, réessaie.",
            true
        );
    };

    const sendVoiceMessage = async (blob: Blob, durationSeconds: number, replyTarget?: Message | null) => {
        if (!user || !conversation || sending) return;
        // Un vocal ne peut pas être "joué" avant la fin de l'upload (il
        // faut le fichier réel), mais on montre tout de suite qu'il part,
        // pour garder le bon ordre visuel (message avant points de
        // réflexion).
        const tempId = `temp-${Date.now()}`;
        await dispatch(
            buildOptimisticMessage(conversation.$id, user.$id, '🎤 Envoi du vocal...', tempId, replyJson(replyTarget)),
            () => messageService.sendVoice(conversation, blob, durationSeconds, replyTarget?.$id),
            () => "Impossible d'envoyer le vocal, réessaie.",
            true
        );
    };

    // Photo, avec légende optionnelle dans le MÊME message. Sans légende,
    // avec Vanessa : aucune réponse automatique (elle attend une demande
    // explicite). Avec légende, la légende EST la demande.
    const sendImageMessage = async (file: File, caption = '', replyTarget?: Message | null) => {
        if (!user || !conversation || sending) return;
        const tempId = `temp-${Date.now()}`;
        const localImageUrl = URL.createObjectURL(file);
        await dispatch(
            buildOptimisticMessage(conversation.$id, user.$id, caption.trim(), tempId, { type: 'image', localImageUrl, ...replyJson(replyTarget) }),
            () => messageService.sendImage(conversation, file, caption, replyTarget?.$id),
            // Le message d'erreur du quota est spécifique et utile à
            // afficher tel quel (ex: "Tu as atteint la limite...").
            (err) => err?.message || "Impossible d'envoyer l'image, réessaie.",
            !!caption.trim()
        );
        // L'aperçu local n'est plus utile une fois le vrai message affiché.
        setTimeout(() => URL.revokeObjectURL(localImageUrl), 30_000);
    };

    // Document joint (PDF, Word, Excel...), avec légende optionnelle.
    const sendFileMessage = async (file: File, caption = '', replyTarget?: Message | null) => {
        if (!user || !conversation || sending) return;
        const tempId = `temp-${Date.now()}`;
        await dispatch(
            buildOptimisticMessage(conversation.$id, user.$id, caption.trim(), tempId, { type: 'file', localFile: { name: file.name, size: file.size }, ...replyJson(replyTarget) }),
            () => messageService.sendFile(conversation, file, caption, replyTarget?.$id),
            (err) => err?.message || "Impossible d'envoyer le document, réessaie.",
            false
        );
    };

    return {
        conversation, otherName, otherId, messages, loading, sending, error, sendError, sendMessage, sendVoiceMessage,
        sendImageMessage, sendFileMessage, isVanessaConversation,
        loadingOlder, hasMoreOlder, loadOlder, loadOlderUntil, vanessaTyping,
    };
};
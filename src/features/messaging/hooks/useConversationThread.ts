// src/features/messaging/hooks/useConversationThread.ts — Ça Parle
import { useState, useEffect, useCallback, useRef } from 'react';
import { messageService, type Message } from '../services/messageService';
import { conversationService, type Conversation } from '../services/conversationService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { dbService } from '@/api/database';
import { VANESSA_USER_ID } from '@/api/constants';

const PAGE_SIZE = 30;
// Si Vanessa ne répond pas dans ce délai (échec silencieux d'appel IA côté
// serveur, quota dépassé, etc.), on arrête d'afficher "elle écrit..." pour
// ne pas laisser l'indicateur tourner indéfiniment.
const VANESSA_TYPING_TIMEOUT_MS = 25_000;

function buildOptimisticMessage(conversationId: string, senderId: string, content: string, tempId: string): Message {
    const nowIso = new Date().toISOString();
    return {
        $id: tempId,
        $collectionId: '', $databaseId: '', $permissions: [],
        $createdAt: nowIso, $updatedAt: nowIso,
        conversationId, senderId, content,
        type: 'text', readBy: [senderId], createdAt: nowIso,
    } as unknown as Message;
}

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

    const sendMessage = async (content: string) => {
        if (!user || !conversation || !content.trim() || sending) return;
        setSending(true);
        setSendError(null);
        startWaitingForVanessa();

        // Affichage optimiste IMMÉDIAT du message — AVANT même l'appel
        // réseau, exactement comme le fait Astra sur DataInsight (comparé
        // et vérifié). Auparavant, le message n'apparaissait qu'une fois
        // la Function entièrement terminée (message créé + réponse de
        // Vanessa générée), ce qui donnait l'impression que "les points de
        // réflexion" arrivaient avant le message lui-même — déroutant pour
        // l'utilisateur.
        const tempId = `temp-${Date.now()}`;
        pendingTempIds.current.push(tempId);
        setMessages((prev) => [...prev, buildOptimisticMessage(conversation.$id, user.$id, content.trim(), tempId)]);

        try {
            const sentMessage = await messageService.send(conversation, user.$id, content.trim());
            if (sentMessage && pendingTempIds.current.includes(tempId)) {
                // Toujours en attente : le temps réel n'a pas encore
                // remplacé ce message temporaire, on le fait ici.
                pendingTempIds.current = pendingTempIds.current.filter((id) => id !== tempId);
                seenIds.current.add(sentMessage.$id);
                setMessages((prev) => prev.map((m) => (m.$id === tempId ? sentMessage : m)));
            }
        } catch {
            pendingTempIds.current = pendingTempIds.current.filter((id) => id !== tempId);
            // Retire le message optimiste raté — sinon l'utilisateur croit
            // qu'il est parti alors que ce n'est pas le cas.
            setMessages((prev) => prev.filter((m) => m.$id !== tempId));
            setSendError("Impossible d'envoyer le message, réessaie.");
            setVanessaTyping(false);
            clearTypingTimeout();
        } finally {
            setSending(false);
        }
    };

    const sendVoiceMessage = async (blob: Blob, durationSeconds: number) => {
        if (!user || !conversation || sending) return;
        setSending(true);
        setSendError(null);
        startWaitingForVanessa();

        // Un vocal ne peut pas être "joué" avant la fin de l'upload (il
        // faut le fichier réel), mais on montre tout de suite qu'il part,
        // pour garder le bon ordre visuel (message avant points de
        // réflexion).
        const tempId = `temp-${Date.now()}`;
        pendingTempIds.current.push(tempId);
        setMessages((prev) => [...prev, buildOptimisticMessage(conversation.$id, user.$id, '🎤 Envoi du vocal...', tempId)]);

        try {
            const sentMessage = await messageService.sendVoice(conversation, blob, durationSeconds);
            if (sentMessage && pendingTempIds.current.includes(tempId)) {
                pendingTempIds.current = pendingTempIds.current.filter((id) => id !== tempId);
                seenIds.current.add(sentMessage.$id);
                setMessages((prev) => prev.map((m) => (m.$id === tempId ? sentMessage : m)));
            }
        } catch {
            pendingTempIds.current = pendingTempIds.current.filter((id) => id !== tempId);
            setMessages((prev) => prev.filter((m) => m.$id !== tempId));
            setSendError("Impossible d'envoyer le vocal, réessaie.");
            setVanessaTyping(false);
            clearTypingTimeout();
        } finally {
            setSending(false);
        }
    };

    // Une image seule ne déclenche jamais de réponse automatique — pas de
    // startWaitingForVanessa() ici, elle ne se déclenche que sur le
    // prochain message texte qui en fera la demande.
    const sendImageMessage = async (file: File) => {
        if (!user || !conversation || sending) return;
        setSending(true);
        setSendError(null);
        try {
            const sentMessage = await messageService.sendImage(conversation, file);
            if (sentMessage && !seenIds.current.has(sentMessage.$id)) {
                seenIds.current.add(sentMessage.$id);
                setMessages((prev) => [...prev, sentMessage]);
            }
        } catch (err: any) {
            // Le message d'erreur du quota est spécifique et utile à
            // afficher tel quel (ex: "Tu as atteint la limite...").
            setSendError(err?.message || "Impossible d'envoyer l'image, réessaie.");
        } finally {
            setSending(false);
        }
    };

    return {
        conversation, otherName, otherId, messages, loading, sending, error, sendError, sendMessage, sendVoiceMessage,
        sendImageMessage, isVanessaConversation,
        loadingOlder, hasMoreOlder, loadOlder, vanessaTyping,
    };
};
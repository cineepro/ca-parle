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
    }, [conversationId]);

    const sendMessage = async (content: string) => {
        if (!user || !conversation || !content.trim() || sending) return;
        setSending(true);
        setSendError(null);
        // Démarré AVANT l'envoi, pas après : la Function traite tout en
        // un seul appel bloquant (message humain + réponse de Vanessa), sa
        // réponse peut donc arriver par le temps réel avant même que ce
        // sendMessage() ait fini d'attendre — d'où l'indicateur affiché
        // dès le départ, pas une fois la réponse déjà revenue.
        startWaitingForVanessa();
        try {
            const sentMessage = await messageService.send(conversation, user.$id, content.trim());
            if (sentMessage && !seenIds.current.has(sentMessage.$id)) {
                seenIds.current.add(sentMessage.$id);
                setMessages((prev) => [...prev, sentMessage]);
            }
        } catch {
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
        try {
            const sentMessage = await messageService.sendVoice(conversation, blob, durationSeconds);
            if (sentMessage && !seenIds.current.has(sentMessage.$id)) {
                seenIds.current.add(sentMessage.$id);
                setMessages((prev) => [...prev, sentMessage]);
            }
        } catch {
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
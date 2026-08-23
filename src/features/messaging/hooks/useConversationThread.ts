// src/features/messaging/hooks/useConversationThread.ts — Ça Parle
import { useState, useEffect, useCallback, useRef } from 'react';
import { messageService, type Message } from '../services/messageService';
import { conversationService, type Conversation } from '../services/conversationService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { dbService } from '@/api/database';

export const useConversationThread = (conversationId: string) => {
    const { user } = useAuth();
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [otherName, setOtherName] = useState('Utilisateur');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const seenIds = useRef(new Set<string>());

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [conv, msgs] = await Promise.all([
                conversationService.getById(conversationId),
                messageService.getByConversation(conversationId),
            ]);
            setConversation(conv);
            setMessages(msgs);
            seenIds.current = new Set(msgs.map((m) => m.$id));

            const otherId = conversationService.getOtherParticipantId(conv, user.$id);
            if (otherId) {
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

    // Abonnement temps réel : tant que le composant est monté, tout nouveau
    // message de cette conversation apparaît immédiatement, sans recharger.
    useEffect(() => {
        const unsubscribe = messageService.subscribeToConversation(conversationId, (message) => {
            if (seenIds.current.has(message.$id)) return;
            seenIds.current.add(message.$id);
            setMessages((prev) => [...prev, message]);
        });
        return unsubscribe;
    }, [conversationId]);

    const sendMessage = async (content: string) => {
        if (!user || !conversation || !content.trim() || sending) return;
        setSending(true);
        try {
            await messageService.send(conversation, user.$id, content.trim());
            // Le message envoyé revient via la souscription temps réel —
            // pas besoin de l'ajouter manuellement (évite les doublons).
        } catch {
            setError("Impossible d'envoyer le message, réessaie.");
        } finally {
            setSending(false);
        }
    };

    return { conversation, otherName, messages, loading, sending, error, sendMessage };
};
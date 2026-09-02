// src/features/messaging/hooks/useConversations.ts — Ça Parle
import { useState, useEffect, useCallback } from 'react';
import { conversationService, type Conversation } from '../services/conversationService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { dbService } from '@/api/database';
import { VANESSA_USER_ID } from '@/api/constants';

export interface ConversationWithParticipant {
    conversation: Conversation;
    otherName: string;
}

export const useConversations = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<ConversationWithParticipant[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const list = await conversationService.listForUser(user.$id);

            const enriched = await Promise.all(
                list.map(async (conversation) => {
                    const otherId = conversationService.getOtherParticipantId(conversation, user.$id);
                    let otherName = 'Utilisateur';
                    if (otherId) {
                        try {
                            const profile: any = await dbService.getUserProfile(otherId);
                            otherName = profile.name || 'Utilisateur';
                        } catch { /* profil introuvable, garde le nom par défaut */ }
                    }
                    return { conversation, otherName };
                })
            );

            // Vanessa toujours épinglée en tête de liste, si une
            // conversation avec elle existe.
            enriched.sort((a, b) => {
                const aIsVanessa = a.conversation.participantIds.includes(VANESSA_USER_ID);
                const bIsVanessa = b.conversation.participantIds.includes(VANESSA_USER_ID);
                if (aIsVanessa && !bIsVanessa) return -1;
                if (!aIsVanessa && bIsVanessa) return 1;
                return 0;
            });

            setItems(enriched);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        load();
    }, [load]);

    return { items, loading, refresh: load };
};

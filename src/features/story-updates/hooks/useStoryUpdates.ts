// src/features/story-updates/hooks/useStoryUpdates.ts — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { storyUpdateService, type StoryUpdate, type StoryUpdateType } from '../services/storyUpdateService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';

export const useStoryUpdates = (storyId: string) => {
    const { user } = useAuth();
    const [updates, setUpdates] = useState<StoryUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await storyUpdateService.getByStory(storyId);
            setUpdates(list);
        } finally {
            setLoading(false);
        }
    }, [storyId]);

    useEffect(() => {
        load();
    }, [load]);

    const addUpdate = async (content: string, type: StoryUpdateType) => {
        if (!user || !content.trim()) return;
        setPosting(true);
        try {
            await storyUpdateService.create(storyId, user.$id, content, type);

            // Si l'auteur ajoute une "confirmation" ou un "dementi", on
            // répercute automatiquement le statut de l'histoire.
            if (type === 'confirmation') {
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.STORIES, storyId, { status: 'confirme' }).catch(() => {});
            } else if (type === 'dementi') {
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.STORIES, storyId, { status: 'dementi' }).catch(() => {});
            } else if (type === 'contradiction') {
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.STORIES, storyId, { status: 'en_verification' }).catch(() => {});
            }

            await load();
        } finally {
            setPosting(false);
        }
    };

    return { updates, loading, posting, addUpdate };
};

// src/features/stories/hooks/useCreateStory.ts — Ça Parle
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storyService, type StoryType } from '../services/storyService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { reputationService } from '@/features/reputation/services/reputationService';
import { refreshReputation } from '@/features/reputation/hooks/useReputation';

export const useCreateStory = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createStory = async (data: {
        title: string;
        content: string;
        type: StoryType;
        categoryId: string;
        isAnonymous: boolean;
    }) => {
        if (!user) {
            setError('Tu dois être connecté pour publier.');
            return;
        }
        if (!data.title.trim() || !data.content.trim()) {
            setError('Le titre et le contenu sont obligatoires.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const story = await storyService.createStory({
                ...data,
                authorId: user.$id,
                authorName: user.name,
            });

            // Compteurs de réputation (best-effort, non bloquant pour la
            // navigation même si ça échoue).
            reputationService.incrementCounter(user.$id, 'storiesCount').then(() => {
                if (data.type === 'revelation') {
                    reputationService.incrementCounter(user.$id, 'revelationsCount').then(() => refreshReputation(user.$id));
                } else {
                    refreshReputation(user.$id);
                }
            });

            navigate(`/histoire/${story.$id}`);
        } catch (err: any) {
            setError(err.message || 'Impossible de publier ton histoire.');
        } finally {
            setLoading(false);
        }
    };

    return { createStory, loading, error };
};
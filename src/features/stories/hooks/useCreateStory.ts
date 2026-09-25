// src/features/stories/hooks/useCreateStory.ts — Vanessa
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storyService, type StoryType } from '../services/storyService';
import { useAuth } from '@/features/auth/hooks/useAuth';

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
        country?: string;
        isAnonymous: boolean;
        referenceIds?: string[];
        coverImageId?: string;
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

            // Compteurs de réputation et badges désormais gérés
            // automatiquement côté serveur par la Function
            // `on-story-created`, déclenchée sur la création du document —
            // plus aucun calcul à faire ici.

            navigate(`/histoire/${story.$id}`);
        } catch (err: any) {
            setError(err.message || 'Impossible de publier ton histoire.');
        } finally {
            setLoading(false);
        }
    };

    return { createStory, loading, error };
};

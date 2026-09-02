// src/features/stories/hooks/useTrendingStories.ts — Ça Parle
import { useState, useEffect, useCallback } from 'react';
import { storyService, type Story } from '../services/storyService';

export const useTrendingStories = () => {
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await storyService.getMostReacted(30);
            setStories(result.documents);
        } catch (err: any) {
            setError(err.message || 'Impossible de charger les tendances.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { stories, loading, error, refresh: load };
};

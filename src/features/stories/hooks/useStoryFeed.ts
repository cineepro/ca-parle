// src/features/stories/hooks/useStoryFeed.ts — Ça Parle
import { useState, useEffect, useCallback, useRef } from 'react';
import { storyService, type Story } from '../services/storyService';

export const useStoryFeed = (categorySlug: string, countrySlug: string = 'tous') => {
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cursorRef = useRef<string | undefined>(undefined);
    const PAGE_SIZE = 20;

    const loadInitial = useCallback(async () => {
        setLoading(true);
        setError(null);
        cursorRef.current = undefined;
        try {
            const result = await storyService.getFeed({ limit: PAGE_SIZE, categorySlug, countrySlug });
            setStories(result.documents);
            setHasMore(result.documents.length === PAGE_SIZE);
            cursorRef.current = result.documents.at(-1)?.$id;
        } catch (err: any) {
            setError(err.message || 'Impossible de charger le fil.');
        } finally {
            setLoading(false);
        }
    }, [categorySlug, countrySlug]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const result = await storyService.getFeed({
                limit: PAGE_SIZE,
                categorySlug,
                countrySlug,
                cursor: cursorRef.current,
            });
            setStories((prev) => [...prev, ...result.documents]);
            setHasMore(result.documents.length === PAGE_SIZE);
            cursorRef.current = result.documents.at(-1)?.$id;
        } catch {
            // Silencieux — l'utilisateur garde le contenu déjà chargé.
        } finally {
            setLoadingMore(false);
        }
    }, [categorySlug, countrySlug, hasMore, loadingMore]);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    return { stories, loading, loadingMore, hasMore, error, loadMore, refresh: loadInitial };
};

// src/features/stories/hooks/useStoryFeed.ts — Vanessa
import { useState, useEffect, useCallback, useRef } from 'react';
import { storyService, type Story } from '../services/storyService';
import { rankStories } from '../utils/feedRanking';

interface Options {
    // true = le fil est classé par l'algorithme (fil plein écran) ;
    // false = ordre chronologique (comportement d'origine).
    ranked?: boolean;
}

interface CacheEntry {
    stories: Story[];
    hasMore: boolean;
    cursor?: string;
    savedAt: number;
}

// Mémoire de la session : quand on ouvre une histoire puis qu'on revient,
// le fil retrouve exactement le même ordre (sans re-tri ni rechargement),
// comme sur TikTok. Elle expire après 5 minutes.
const FEED_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export const useStoryFeed = (
    categorySlug: string,
    countrySlug: string = 'tous',
    { ranked = false }: Options = {}
) => {
    const cacheKey = `${categorySlug}|${countrySlug}|${ranked ? 'r' : 'c'}`;
    const initial = ranked ? FEED_CACHE.get(cacheKey) : undefined;
    const initialValid = !!initial && Date.now() - initial.savedAt < CACHE_TTL_MS;

    const [stories, setStories] = useState<Story[]>(initialValid ? initial!.stories : []);
    const [loading, setLoading] = useState(!initialValid);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialValid ? initial!.hasMore : true);
    const [error, setError] = useState<string | null>(null);

    const cursorRef = useRef<string | undefined>(initialValid ? initial!.cursor : undefined);
    const PAGE_SIZE = ranked ? 25 : 20;

    const loadInitial = useCallback(async (force = false) => {
        if (ranked && !force) {
            const cached = FEED_CACHE.get(cacheKey);
            if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
                setStories(cached.stories);
                setHasMore(cached.hasMore);
                cursorRef.current = cached.cursor;
                setLoading(false);
                return;
            }
        }
        setLoading(true);
        setError(null);
        cursorRef.current = undefined;
        try {
            const result = await storyService.getFeed({ limit: PAGE_SIZE, categorySlug, countrySlug });
            const docs = ranked ? rankStories(result.documents) : result.documents;
            setStories(docs);
            setHasMore(result.documents.length === PAGE_SIZE);
            cursorRef.current = result.documents.at(-1)?.$id;
        } catch (err: any) {
            setError(err.message || 'Impossible de charger le fil.');
        } finally {
            setLoading(false);
        }
    }, [categorySlug, countrySlug, ranked, cacheKey, PAGE_SIZE]);

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
            // Chaque nouvelle page est classée à part : les histoires déjà
            // affichées ne bougent jamais sous les doigts de la personne.
            const docs = ranked ? rankStories(result.documents) : result.documents;
            setStories((prev) => {
                const known = new Set(prev.map((s) => s.$id));
                return [...prev, ...docs.filter((s) => !known.has(s.$id))];
            });
            setHasMore(result.documents.length === PAGE_SIZE);
            cursorRef.current = result.documents.at(-1)?.$id;
        } catch {
            // Silencieux — l'utilisateur garde le contenu déjà chargé.
        } finally {
            setLoadingMore(false);
        }
    }, [categorySlug, countrySlug, hasMore, loadingMore, ranked, PAGE_SIZE]);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    // Sauvegarde dans la mémoire de session à chaque changement du fil.
    useEffect(() => {
        if (ranked && !loading && stories.length > 0) {
            FEED_CACHE.set(cacheKey, { stories, hasMore, cursor: cursorRef.current, savedAt: Date.now() });
        }
    }, [ranked, loading, stories, hasMore, cacheKey]);

    const refresh = useCallback(() => {
        FEED_CACHE.delete(cacheKey);
        return loadInitial(true);
    }, [cacheKey, loadInitial]);

    return { stories, loading, loadingMore, hasMore, error, loadMore, refresh };
};
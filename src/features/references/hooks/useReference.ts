// src/features/references/hooks/useReference.ts — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { referenceService, type Reference } from '../services/referenceService';
import { storyReferenceService } from '../services/storyReferenceService';
import { storyService, type Story } from '@/features/stories/services/storyService';

export const useReference = (slug: string | undefined) => {
    const [reference, setReference] = useState<Reference | null>(null);
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!slug) return;
        setLoading(true);
        setError(null);
        try {
            const ref = await referenceService.getBySlug(slug);
            if (!ref) {
                setError('Cette fiche est introuvable.');
                return;
            }
            setReference(ref);

            const storyIds = await storyReferenceService.getStoryIdsForReference(ref.$id);
            const results = await Promise.allSettled(storyIds.map((id) => storyService.getStoryById(id)));
            setStories(
                results
                    .filter((r): r is PromiseFulfilledResult<Story> => r.status === 'fulfilled')
                    .map((r) => r.value)
                    .sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
            );
        } catch {
            setError('Impossible de charger cette fiche.');
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        load();
    }, [load]);

    return { reference, stories, loading, error, refresh: load };
};

// src/features/references/hooks/useReferenceSearch.ts — Ça Parle
import { useState, useEffect } from 'react';
import { referenceService, type Reference } from '../services/referenceService';

export const useReferenceSearch = (query: string) => {
    const [results, setResults] = useState<Reference[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        const timeout = setTimeout(async () => {
            try {
                const found = await referenceService.search(query);
                setResults(found);
            } finally {
                setLoading(false);
            }
        }, 300); // debounce

        return () => clearTimeout(timeout);
    }, [query]);

    return { results, loading };
};

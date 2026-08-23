// src/features/messaging/hooks/useUserSearch.ts — Ça Parle
import { useState, useEffect } from 'react';
import { dbService } from '@/api/database';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface UserSearchResult {
    $id: string;
    name: string;
}

export const useUserSearch = (query: string) => {
    const { user } = useAuth();
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        setLoading(true);
        const timeout = setTimeout(async () => {
            try {
                const found = await dbService.searchUsers(query, user?.$id);
                setResults(found as UserSearchResult[]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [query, user]);

    return { results, loading };
};
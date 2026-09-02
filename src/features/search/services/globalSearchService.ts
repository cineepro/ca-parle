// src/features/search/services/globalSearchService.ts — Ça Parle
import { storyService, type Story } from '@/features/stories/services/storyService';
import { referenceService, type Reference } from '@/features/references/services/referenceService';
import { dbService, type UserProfile } from '@/api/database';

export interface GlobalSearchResults {
    stories: Story[];
    references: Reference[];
    users: UserProfile[];
}

export const globalSearchService = {
    // Les 3 recherches existaient déjà séparément (titre d'histoire, nom de
    // référence, nom d'utilisateur) — on les lance juste en parallèle.
    async search(query: string): Promise<GlobalSearchResults> {
        if (!query.trim()) return { stories: [], references: [], users: [] };

        const [stories, references, users] = await Promise.all([
            storyService.searchByTitle(query, 8),
            referenceService.search(query, 8),
            dbService.searchUsers(query, undefined, 8),
        ]);

        return { stories, references, users };
    },
};

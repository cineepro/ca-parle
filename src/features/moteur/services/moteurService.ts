// src/features/moteur/services/moteurService.ts — Zem
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export type ZemCategory = 'actualites' | 'etudes' | 'administration' | 'sante' | 'emploi' | 'marche' | 'culture' | 'sport' | 'services' | 'autre';

export interface ZemResult {
    id: string;
    url: string;
    host: string;
    title: string;
    snippet: string;
    category: ZemCategory;
    city: string;
    trust: 1 | 2 | 3;
    publishedAt: string;
    sourceLabel: string;
    score?: number;
}

export interface ZemSearchResponse {
    total: number;
    page: number;
    hasMore: boolean;
    words: string[];
    results: ZemResult[];
}

export interface ZemHome {
    categories: Partial<Record<ZemCategory, number>>;
    latest: ZemResult[];
}

export interface ZemReadPage {
    id: string;
    url: string;
    title: string;
    host: string;
    sourceLabel: string;
    publishedAt: string;
    excerpt: string;
    truncated: boolean;
}

// --- Console : sites indexés ---
export interface ZemSource {
    $id: string;
    url: string;
    label: string;
    category: ZemCategory;
    city: string;
    trust: 1 | 2 | 3;
    active: boolean;
    sitemapUrl?: string;
    feedUrl?: string;
    maxPages: number;
    lastCrawledAt?: string;
    lastStatus?: string;
    pagesCount?: number;
}

export interface ZemSourceInput {
    url: string;
    label?: string;
    category?: ZemCategory;
    city?: string;
    trust?: 1 | 2 | 3;
    sitemapUrl?: string;
    feedUrl?: string;
    maxPages?: number;
}

export interface ZemStats { sources: number; activeSources: number; pages: number; lastCrawledAt: string }
export interface ZemMissed { q: string; count: number }

export const moteurService = {
    search: (q: string, opts: { category?: ZemCategory | ''; city?: string; page?: number } = {}) =>
        callFunction<ZemSearchResponse>(FUNCTIONS.SEARCH_ENGINE, { action: 'search', q, ...opts }),
    home: () => callFunction<ZemHome>(FUNCTIONS.SEARCH_ENGINE, { action: 'home' }),
    read: async (id: string) => (await callFunction<{ page: ZemReadPage }>(FUNCTIONS.SEARCH_ENGINE, { action: 'read', id })).page,

    // Console (modérateurs)
    listSources: async () => (await callFunction<{ sources: ZemSource[] }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'list' })).sources,
    addSource: (input: ZemSourceInput) => callFunction(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'add', ...input }),
    addMany: (text: string) => callFunction<{ added: number; skipped: { line: string; reason: string }[] }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'add_many', text }),
    updateSource: (id: string, data: Partial<ZemSourceInput> & { active?: boolean }) => callFunction(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'update', id, ...data }),
    // Retire le site puis ses pages, par lots : on rappelle tant que `done` est faux.
    async removeSource(id: string) {
        for (let i = 0; i < 40; i++) {
            const r = await callFunction<{ done: boolean }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'remove', id });
            if (r.done) return;
        }
    },
    stats: () => callFunction<ZemStats>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'stats' }),
    missed: async () => (await callFunction<{ missed: ZemMissed[] }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'missed' })).missed,
};

// (ajout) parcours d'une rubrique sans mot cherché
export const browseCategory = (category: ZemCategory, page = 0) =>
    callFunction<ZemSearchResponse>(FUNCTIONS.SEARCH_ENGINE, { action: 'browse', category, page });

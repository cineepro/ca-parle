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
    // Si la question contenait une faute et que Zem l'a corrigée : ce qui était écrit et ce qui a été cherché.
    corrected?: { from: string; to: string } | null;
    total: number;
    page: number;
    hasMore: boolean;
    words: string[];
    results: ZemResult[];
    answer?: ZemAnswer | null;
}

// « Réponse rapide » : phrases recopiées des meilleures pages, chacune avec sa source (aucune IA).
export interface ZemAnswerPoint {
    text: string;
    source: { id: string; title: string; host: string; url: string; sourceLabel: string };
}
export interface ZemAnswer { points: ZemAnswerPoint[] }

export type ZemReportReason = 'faux' | 'depasse' | 'inapproprie' | 'autre';

export interface ZemPublicStats {
    pages: number;
    lastUpdateAt: string;
    searches7d: number | null;
    answered7d: number | null;
    sources: { label: string; host: string; category: ZemCategory }[];
}

export interface ZemReport { id: string; message: string; url: string; docId: string; reason: string; note: string; createdAt: string }

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

// --- Console : fiches manuelles ---
export interface ZemCard {
    id: string;
    title: string;
    text: string;
    link: string;
    category: ZemCategory;
    city: string;
    trust: 1 | 2 | 3;
    publishedAt: string;
    clicks: number;
}
export type ZemCardInput = Omit<ZemCard, 'id' | 'clicks' | 'publishedAt'> & { id?: string; publishedAt?: string };

// --- Console : connecteurs de Vanessa dans Zem ---
export interface ZemConnectorIndex {
    id: string;
    name: string;
    icon: string;
    active: boolean; // connecteur actif côté Vanessa
    enabled: boolean; // ses notes sont indexées dans Zem
    category: ZemCategory;
    trust: 1 | 2 | 3;
    pagesCount: number;
    lastCrawledAt: string;
    lastStatus: string;
}
export interface ZemSyncResult { connectors: number; written: number; unchanged: number; removed: number; done: boolean }

// --- Console : statistiques ---
export interface ZemClicked { id: string; title: string; url: string; clicks: number; sourceLabel: string }
export interface ZemQueryStat { q: string; count: number; empty: number }

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
    // Note qu'un résultat a été ouvert (sert à classer ; jamais bloquant, sans identité).
    click: (id: string) => { callFunction(FUNCTIONS.SEARCH_ENGINE, { action: 'click', id }).catch(() => {}); },
    read: async (id: string) => (await callFunction<{ page: ZemReadPage }>(FUNCTIONS.SEARCH_ENGINE, { action: 'read', id })).page,

    // Signale un résultat à l'équipe (faux, dépassé, inapproprié).
    report: (id: string, reason: ZemReportReason, note = '') => callFunction(FUNCTIONS.SEARCH_ENGINE, { action: 'report', id, reason, note }),
    publicStats: () => callFunction<ZemPublicStats>(FUNCTIONS.SEARCH_ENGINE, { action: 'public_stats' }),

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
    // Fiches manuelles
    listCards: async () => (await callFunction<{ cards: ZemCard[] }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'list_cards' })).cards,
    saveCard: (card: ZemCardInput) => callFunction(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'save_card', ...card }),
    deleteCard: (id: string) => callFunction(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'delete_card', id }),

    // Connecteurs de Vanessa dans Zem
    listConnectorIndex: async () => (await callFunction<{ connectors: ZemConnectorIndex[] }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'list_connector_index' })).connectors,
    async setConnectorIndex(connectorId: string, enabled: boolean, category?: ZemCategory, trust?: 1 | 2 | 3) {
        for (let i = 0; i < 40; i++) { // le retrait se fait par lots
            const r = await callFunction<{ done: boolean }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'set_connector_index', connectorId, enabled, category, trust });
            if (r.done) return;
        }
    },
    // Copie les notes actives dans Zem. Rappelé tant que le serveur n'a pas fini (limite de temps).
    async syncConnectors(connectorId = ''): Promise<ZemSyncResult> {
        const total: ZemSyncResult = { connectors: 0, written: 0, unchanged: 0, removed: 0, done: false };
        for (let i = 0; i < 10 && !total.done; i++) {
            const r = await callFunction<ZemSyncResult>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'sync_connectors', connectorId });
            total.connectors = Math.max(total.connectors, r.connectors);
            total.written += r.written; total.unchanged = r.unchanged; total.removed += r.removed; total.done = r.done;
        }
        return total;
    },

    // Statistiques
    topClicked: async () => (await callFunction<{ items: ZemClicked[] }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'top_clicked' })).items,
    topQueries: async () => (await callFunction<{ queries: ZemQueryStat[]; total: number }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'top_queries' })),

    reports: async () => (await callFunction<{ reports: ZemReport[] }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'reports' })).reports,
    stats: () => callFunction<ZemStats>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'stats' }),
    missed: async () => (await callFunction<{ missed: ZemMissed[] }>(FUNCTIONS.MANAGE_SEARCH_SOURCES, { action: 'missed' })).missed,
};

// (ajout) parcours d'une rubrique sans mot cherché
export const browseCategory = (category: ZemCategory, page = 0) =>
    callFunction<ZemSearchResponse>(FUNCTIONS.SEARCH_ENGINE, { action: 'browse', category, page });

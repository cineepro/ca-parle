// src/features/moteur/lib/offlineStore.ts — Zem
// Garde sur l'appareil les extraits lus, pour les relire sans connexion (30 pages au plus, les plus
// récentes d'abord). Rien ne part sur un serveur : c'est le stockage du navigateur.
import type { ZemReadPage, ZemResult } from '../services/moteurService';

const KEY = 'zem:lus';
const MAX = 30;

export interface SavedRead { result: ZemResult; page: ZemReadPage; savedAt: number }

function load(): SavedRead[] {
    try {
        const raw = localStorage.getItem(KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

export function savedReads(): SavedRead[] {
    return load();
}

export function getSavedRead(id: string): SavedRead | undefined {
    return load().find((x) => x.result.id === id);
}

export function saveRead(result: ZemResult, page: ZemReadPage): void {
    try {
        const list = load().filter((x) => x.result.id !== result.id);
        list.unshift({ result, page, savedAt: Date.now() });
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    } catch {
        /* stockage plein ou indisponible : on ne bloque rien */
    }
}

export function forgetReads(): void {
    try { localStorage.removeItem(KEY); } catch { /* ignoré */ }
}

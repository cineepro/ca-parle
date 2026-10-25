// functions/search-engine/src/vocab.js — Zem
// Vocabulaire de l'index (mots des titres) : sert à rétablir les accents (« universite » →
// « université ») et à corriger les fautes (« inscriptoin »). Gardé 10 minutes en mémoire :
// la lecture (≈300 titres, titres seulement) n'a donc lieu qu'une fois de temps en temps.
import { Query } from 'node-appwrite';
import { buildVocab } from './ranking.js';

const TTL_MS = 10 * 60 * 1000;
const PAGES = 3; // 3 × 100 titres les plus récents
let cache = { at: 0, vocab: null };

export async function getVocab(databases, DATABASE_ID, DOCS, now = Date.now()) {
    if (cache.vocab && now - cache.at < TTL_MS) return cache.vocab;
    try {
        const titles = [];
        let cursor = null;
        for (let i = 0; i < PAGES; i++) {
            const q = [Query.orderDesc('$createdAt'), Query.limit(100), Query.select(['title'])];
            if (cursor) q.push(Query.cursorAfter(cursor));
            const r = await databases.listDocuments(DATABASE_ID, DOCS, q);
            r.documents.forEach((d) => titles.push(d.title));
            if (r.documents.length < 100) break;
            cursor = r.documents[r.documents.length - 1].$id;
        }
        cache = { at: now, vocab: buildVocab(titles) };
    } catch {
        // Lecture impossible : on continue sans vocabulaire (la recherche reste valable).
        return cache.vocab;
    }
    return cache.vocab;
}

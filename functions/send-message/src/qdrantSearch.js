// functions/send-message/src/qdrantSearch.js — Vanessa
// Recherche dans les notes de connaissance via Qdrant : le SENS (embeddings multilingues) et les MOTS (BM25 français)
// sont cherchés en parallèle puis fusionnés ici (RRF), ce qui permet de garder les scores bruts de chaque méthode.
// Les quasi-doublons sont retirés. Variables : QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION.
// Lève une erreur si Qdrant ne répond pas : l'appelant doit alors se rabattre sur knowledgeSearch.js.

const DENSE_VECTOR = 'dense';
const DENSE_MODEL = 'intfloat/multilingual-e5-small';
const TEXT_FIELD = 'search_text';
const RRF_K = 60;

export const GENERAL_CONNECTOR = 'general';
export const DEFAULT_DEDUPE_THRESHOLD = 0.55; // ressemblance (0 à 1) à partir de laquelle deux notes sont des doublons

// ── Quasi-doublons ──────────────────────────────────────────────────────────
const DEDUPE_STOP = new Set('dans pour avec sont cette plus comme tout tous toute toutes leur leurs entre aussi sous elle elles mais fait ainsi etre'.split(' '));

/** Mots significatifs d'un texte (sans accents, au moins 4 caractères, sans mots vides). */
export function contentTokens(text) {
    const normalized = String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return new Set(normalized.split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !DEDUPE_STOP.has(w)));
}

/** Ressemblance entre deux ensembles de mots : 1 = identiques, 0 = rien en commun. */
export function jaccard(a, b) {
    if (a.size === 0 || b.size === 0) return 0;
    let common = 0;
    for (const w of a) if (b.has(w)) common += 1;
    return common / (a.size + b.size - common);
}

/** Garde le premier de chaque groupe de quasi-doublons (la liste doit déjà être triée du meilleur au moins bon). */
export function dedupeByContent(items, getText, threshold = DEFAULT_DEDUPE_THRESHOLD) {
    const kept = [];
    const keptTokens = [];
    const dropped = [];
    for (const item of items) {
        const tokens = contentTokens(getText(item));
        const dupIndex = keptTokens.findIndex((k) => jaccard(k, tokens) >= threshold);
        if (dupIndex >= 0) dropped.push({ item, duplicateOf: kept[dupIndex] });
        else { kept.push(item); keptTokens.push(tokens); }
    }
    return { kept, dropped };
}

// ── Qdrant ──────────────────────────────────────────────────────────────────
async function qdrantQuery(body, timeoutMs) {
    const url = String(process.env.QDRANT_URL || '').replace(/\/+$/, '');
    const apiKey = process.env.QDRANT_API_KEY;
    if (!url || !apiKey) throw new Error('QDRANT_URL ou QDRANT_API_KEY manquant.');
    const collection = process.env.QDRANT_COLLECTION || 'vanessa_knowledge';
    const res = await fetch(`${url}/collections/${collection}/points/query`, {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`Qdrant a répondu ${res.status} : ${(await res.text()).slice(0, 300)}`);
    return (await res.json()).result.points;
}

function connectorFilter(connectorIds) {
    const ids = (connectorIds || []).filter(Boolean);
    if (ids.length === 0) return undefined;
    return { must: [{ key: 'connectorId', match: ids.length === 1 ? { value: ids[0] } : { any: ids } }] };
}

/**
 * Cherche les notes les plus utiles pour une question.
 *  - connectorIds : limiter à ces connecteurs (vide = toute la base) ; « general » = la base générale.
 *  - Renvoie { hits, dropped, ms }. Chaque hit : { noteId, connectorId, category, content, keywords, fused,
 *    dense (score du sens), bm25 (score des mots), denseRank, bm25Rank }.
 */
export async function searchKnowledge(question, { connectorIds = [], limit = 12, perList = 30, dedupeThreshold = DEFAULT_DEDUPE_THRESHOLD, timeoutMs = 4000 } = {}) {
    const q = String(question || '').trim();
    if (!q) return { hits: [], dropped: [], ms: 0 };
    const filter = connectorFilter(connectorIds);
    const withFilter = filter ? { filter } : {};
    const startedAt = Date.now();

    const [dense, bm25] = await Promise.all([
        qdrantQuery({ query: { text: q, model: DENSE_MODEL }, using: DENSE_VECTOR, ...withFilter, limit: perList, with_payload: true }, timeoutMs),
        qdrantQuery({ query: { text: q }, using: TEXT_FIELD, ...withFilter, limit: perList, with_payload: true }, timeoutMs),
    ]);

    const byId = new Map();
    const add = (points, kind) => points.forEach((p, i) => {
        const e = byId.get(p.id) || {
            id: p.id, noteId: p.payload.noteId, connectorId: p.payload.connectorId, category: p.payload.category,
            content: p.payload.content, keywords: p.payload.keywords, createdAt: p.payload.createdAt,
            fused: 0, dense: null, bm25: null, denseRank: null, bm25Rank: null,
        };
        e.fused += 1 / (RRF_K + i + 1);
        e[kind] = p.score;
        e[`${kind}Rank`] = i + 1;
        byId.set(p.id, e);
    });
    add(dense, 'dense');
    add(bm25, 'bm25');

    const ranked = [...byId.values()].sort((a, b) => b.fused - a.fused);
    const { kept, dropped } = dedupeByContent(ranked, (h) => h.content, dedupeThreshold);
    return { hits: kept.slice(0, limit), dropped, ms: Date.now() - startedAt };
}

/** Classe les connecteurs d'après leurs meilleures notes trouvées (somme des 3 meilleurs scores de chacun). */
export function rankConnectors(hits, topPerConnector = 3) {
    const scores = new Map();
    for (const h of hits) {
        const s = scores.get(h.connectorId) || { connectorId: h.connectorId, score: 0, count: 0 };
        if (s.count < topPerConnector) { s.score += h.fused; s.count += 1; }
        scores.set(h.connectorId, s);
    }
    return [...scores.values()].sort((a, b) => b.score - a.score);
}
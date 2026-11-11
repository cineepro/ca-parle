// scripts/qdrant/config.mjs
// Constantes et outils partagés par les scripts Qdrant de Vanessa.
// Node 18+ (fetch intégré) — aucune dépendance à installer.
import { createHash } from 'node:crypto';

export const COLLECTION = process.env.QDRANT_COLLECTION || 'vanessa_knowledge';
export const DENSE_VECTOR = 'dense';
export const DENSE_MODEL = 'intfloat/multilingual-e5-small'; // gratuit, 384 dimensions
export const DENSE_SIZE = 384;
export const TEXT_FIELD = 'search_text'; // champ texte indexé pour le BM25
export const GENERAL_CONNECTOR = 'general'; // valeur de connectorId pour la base générale
// Catégories toujours injectées en entier dans le prompt par send-message : jamais cherchées.
export const EXCLUDED_CATEGORIES = ['lexique', 'ressources_urgence', 'publicite'];
export const MIN_QDRANT_VERSION = [1, 20, 0]; // BM25 sur index full-text

export function need(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
    return v;
}

export function versionAtLeast(version, min) {
    const parts = String(version).split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < min.length; i += 1) {
        if ((parts[i] || 0) > min[i]) return true;
        if ((parts[i] || 0) < min[i]) return false;
    }
    return true;
}

/** Appel REST à Qdrant, avec une nouvelle tentative sur les erreurs temporaires (429 / 5xx). */
export async function qdrant(method, path, body) {
    const url = need('QDRANT_URL').replace(/\/+$/, '');
    const apiKey = need('QDRANT_API_KEY');
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        const res = await fetch(`${url}${path}`, {
            method,
            headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(60000),
        });
        const text = await res.text();
        if (res.ok) {
            try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
        }
        lastError = new Error(`Qdrant ${method} ${path} → ${res.status} : ${text.slice(0, 600)}`);
        lastError.status = res.status;
        if (res.status !== 429 && res.status < 500) break;
        await new Promise((r) => setTimeout(r, 1500));
    }
    throw lastError;
}

// ── Notes Appwrite → points Qdrant ──────────────────────────────────────────

/** Une note est indexée si elle est active, a du contenu et n'est pas d'une catégorie « toujours injectée ». */
export function exclusionReason(note) {
    if (note.active !== true) return 'inactive';
    if (EXCLUDED_CATEGORIES.includes(note.category)) return `catégorie ${note.category}`;
    if (!String(note.content || '').trim()) return 'contenu vide';
    return null;
}

/** Texte cherché : le contenu + les mots-clés (synonymes) écrits par Haiku. Sert au vecteur ET au BM25. */
export function buildSearchText(note) {
    const content = String(note.content || '').trim();
    const keywords = String(note.keywords || '').trim();
    return keywords ? `${content}\n${keywords}` : content;
}

/** Qdrant veut un entier ou un UUID : on dérive un UUID stable de l'identifiant Appwrite (même note = même point). */
export function noteToPointId(noteId) {
    const bytes = Buffer.from(createHash('sha1').update(`vanessa-knowledge:${noteId}`).digest().subarray(0, 16));
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const h = bytes.toString('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function noteToPoint(note) {
    const text = buildSearchText(note);
    return {
        id: noteToPointId(note.$id),
        payload: {
            noteId: note.$id,
            connectorId: note.connectorId || GENERAL_CONNECTOR,
            category: note.category || '',
            content: String(note.content || ''),
            keywords: String(note.keywords || ''),
            [TEXT_FIELD]: text,
            createdAt: note.createdAt || note.$createdAt || '',
        },
        // Qdrant calcule le vecteur lui-même (Cloud Inference) : on envoie seulement le texte.
        vector: { [DENSE_VECTOR]: { text, model: DENSE_MODEL } },
    };
}

// ── Recherche (référence pour le futur module de send-message) ──────────────

export function buildFilter(connectorId) {
    return connectorId ? { must: [{ key: 'connectorId', match: { value: connectorId } }] } : undefined;
}

const withFilter = (prefetch, filter) => (filter ? { ...prefetch, filter } : prefetch);

export async function denseSearch(question, { connectorId, limit = 10 } = {}) {
    const r = await qdrant('POST', `/collections/${COLLECTION}/points/query`, {
        query: { text: question, model: DENSE_MODEL },
        using: DENSE_VECTOR,
        ...(buildFilter(connectorId) ? { filter: buildFilter(connectorId) } : {}),
        limit,
        with_payload: true,
    });
    return r.result.points;
}

export async function bm25Search(question, { connectorId, limit = 10 } = {}) {
    const r = await qdrant('POST', `/collections/${COLLECTION}/points/query`, {
        query: { text: question },
        using: TEXT_FIELD,
        ...(buildFilter(connectorId) ? { filter: buildFilter(connectorId) } : {}),
        limit,
        with_payload: true,
    });
    return r.result.points;
}

/** Recherche hybride : sens (e5) + mots (BM25), fusionnés par RRF. connectorId vide = toute la base. */
export async function hybridSearch(question, { connectorId, limit = 10, prefetch = 20 } = {}) {
    const filter = buildFilter(connectorId);
    const r = await qdrant('POST', `/collections/${COLLECTION}/points/query`, {
        prefetch: [
            withFilter({ query: { text: question, model: DENSE_MODEL }, using: DENSE_VECTOR, limit: prefetch }, filter),
            withFilter({ query: { text: question }, using: TEXT_FIELD, limit: prefetch }, filter),
        ],
        query: { fusion: 'rrf' },
        limit,
        with_payload: true,
    });
    return r.result.points;
}
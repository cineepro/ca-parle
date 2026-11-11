// functions/qdrant-sync/src/qdrantNotes.js
// Outils pour transformer une note Appwrite en point Qdrant.
// ⚠️ Doit rester identique à scripts/qdrant/config.mjs (mêmes règles d'indexation).
import { createHash } from 'node:crypto';

export const COLLECTION = process.env.QDRANT_COLLECTION || 'vanessa_knowledge';
export const DENSE_VECTOR = 'dense';
export const DENSE_MODEL = 'intfloat/multilingual-e5-small';
export const TEXT_FIELD = 'search_text';
export const GENERAL_CONNECTOR = 'general';
// Catégories toujours injectées en entier dans le prompt de Vanessa : jamais cherchées.
export const EXCLUDED_CATEGORIES = ['lexique', 'ressources_urgence', 'publicite'];

export function exclusionReason(note) {
    if (note.active !== true) return 'inactive';
    if (EXCLUDED_CATEGORIES.includes(note.category)) return `catégorie ${note.category}`;
    if (!String(note.content || '').trim()) return 'contenu vide';
    return null;
}

export function buildSearchText(note) {
    const content = String(note.content || '').trim();
    const keywords = String(note.keywords || '').trim();
    return keywords ? `${content}\n${keywords}` : content;
}

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
        vector: { [DENSE_VECTOR]: { text, model: DENSE_MODEL } },
    };
}

/** Appel REST à Qdrant, avec une nouvelle tentative sur les erreurs temporaires (429 / 5xx). */
export async function qdrant(method, path, body) {
    const url = String(process.env.QDRANT_URL || '').replace(/\/+$/, '');
    const apiKey = process.env.QDRANT_API_KEY;
    if (!url || !apiKey) throw new Error('QDRANT_URL ou QDRANT_API_KEY manquant dans les variables de la Function.');
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        const res = await fetch(`${url}${path}`, {
            method,
            headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(12000),
        });
        const text = await res.text();
        if (res.ok) {
            try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
        }
        lastError = new Error(`Qdrant ${method} ${path} → ${res.status} : ${text.slice(0, 400)}`);
        if (res.status !== 429 && res.status < 500) break;
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw lastError;
}
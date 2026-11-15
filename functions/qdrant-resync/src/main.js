// functions/qdrant-resync/src/main.js — Vanessa
// Déclencheur : PLANIFIÉ (cron), ex. "0 3 * * *" = chaque nuit à 3 h (heure UTC).
// Filet de sécurité de qdrant-sync : compare les notes de vanessa_knowledge (Appwrite) à l'index Qdrant et ne
// corrige QUE les différences :
//   - note qui doit être indexée mais absente ou différente dans Qdrant → ajoutée / mise à jour ;
//   - point présent dans Qdrant alors que sa note est inactive, exclue ou supprimée → retiré.
// Cela rattrape un événement manqué (Qdrant en panne, cluster en pause...) et garde le cluster gratuit actif
// (il est mis en pause après une semaine sans activité). N'écrit RIEN dans Appwrite : lecture seule.
// Variables : QDRANT_URL, QDRANT_API_KEY (droit d'écriture), QDRANT_COLLECTION, DATABASE_ID,
// COLLECTION_VANESSA_KNOWLEDGE, APPWRITE_API_KEY (clé Appwrite en LECTURE SEULE sur les documents).
// ⚠️ Laisser « Execute access » vide : personne ne doit pouvoir la lancer depuis l'application.
import { COLLECTION, TEXT_FIELD, qdrant, exclusionReason, noteToPoint, noteToPointId } from './qdrantNotes.js';

const SOFT_TIME_BUDGET_MS = 100_000; // à régler avec le Timeout de la Function (120 s conseillé)
const UPSERT_BATCH = 16;

async function fetchAllNotes() {
    const endpoint = String(process.env.APPWRITE_FUNCTION_API_ENDPOINT || '').replace(/\/+$/, '');
    const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const key = process.env.APPWRITE_API_KEY;
    const db = process.env.DATABASE_ID;
    const col = process.env.COLLECTION_VANESSA_KNOWLEDGE;
    if (!endpoint || !project || !key || !db || !col) throw new Error('Variables Appwrite manquantes (APPWRITE_API_KEY, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE).');
    const notes = [];
    let cursor = null;
    for (;;) {
        const params = new URLSearchParams();
        params.append('queries[]', JSON.stringify({ method: 'limit', values: [100] }));
        if (cursor) params.append('queries[]', JSON.stringify({ method: 'cursorAfter', values: [cursor] }));
        const res = await fetch(`${endpoint}/databases/${db}/collections/${col}/documents?${params}`, {
            headers: { 'X-Appwrite-Project': project, 'X-Appwrite-Key': key },
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`Appwrite ${res.status} : ${(await res.text()).slice(0, 300)}`);
        const docs = (await res.json()).documents || [];
        notes.push(...docs);
        if (docs.length < 100) break;
        cursor = docs[docs.length - 1].$id;
    }
    return notes;
}

// Tous les points actuellement dans Qdrant, avec juste de quoi les comparer (pas les vecteurs).
async function fetchQdrantPoints() {
    const points = new Map();
    let offset;
    for (;;) {
        const r = await qdrant('POST', `/collections/${COLLECTION}/points/scroll`, {
            limit: 250, with_vector: false,
            with_payload: { include: ['noteId', 'connectorId', 'category', TEXT_FIELD] },
            ...(offset ? { offset } : {}),
        });
        for (const p of r.result.points) points.set(p.id, p.payload || {});
        offset = r.result.next_page_offset;
        if (!offset) break;
    }
    return points;
}

export default async ({ res, log, error }) => {
    const startedAt = Date.now();
    const timeIsUp = () => Date.now() - startedAt > SOFT_TIME_BUDGET_MS;

    try {
        const notes = await fetchAllNotes();
        const expected = new Map(); // identifiant de point → point attendu
        for (const n of notes) {
            if (exclusionReason(n)) continue;
            const point = noteToPoint(n);
            expected.set(point.id, point);
        }
        const existing = await fetchQdrantPoints();
        log(`📖 ${notes.length} note(s) Appwrite → ${expected.size} à indexer ; Qdrant contient ${existing.size} point(s).`);

        const toUpsert = [];
        for (const [id, point] of expected) {
            const current = existing.get(id);
            const same = current
                && current[TEXT_FIELD] === point.payload[TEXT_FIELD]
                && current.connectorId === point.payload.connectorId
                && current.category === point.payload.category;
            if (!same) toUpsert.push(point);
        }
        const toDelete = [...existing.keys()].filter((id) => !expected.has(id));

        let added = 0;
        for (let i = 0; i < toUpsert.length; i += UPSERT_BATCH) {
            if (timeIsUp()) { log('⏱ Budget de temps atteint : le reste sera traité au prochain passage.'); break; }
            const batch = toUpsert.slice(i, i + UPSERT_BATCH);
            await qdrant('PUT', `/collections/${COLLECTION}/points?wait=true`, { points: batch }, { timeoutMs: 45000 });
            added += batch.length;
        }

        let removed = 0;
        if (toDelete.length > 0 && !timeIsUp()) {
            await qdrant('POST', `/collections/${COLLECTION}/points/delete?wait=true`, { points: toDelete });
            removed = toDelete.length;
        }

        const incomplete = added < toUpsert.length || removed < toDelete.length;
        log(`🔄 Resynchronisation : ${added}/${toUpsert.length} ajoutée(s) ou corrigée(s), ${removed}/${toDelete.length} retirée(s)${incomplete ? ' (incomplet, suite au prochain passage)' : ''}.`);
        return res.json({ success: true, notes: notes.length, indexed: expected.size, added, removed, incomplete });
    } catch (err) {
        error(`❌ Resynchronisation Qdrant échouée : ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};
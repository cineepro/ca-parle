// functions/manage-search-sources/src/syncConnectors.js — Zem
// Indexe dans Zem les notes ACTIVES des connecteurs de Vanessa que l'équipe a cochés dans
// Console → Zem → Connecteurs. Aucune IA, aucun jeton Claude : simple copie du texte.
// Garde-fous :
//  • seulement les notes activées (déjà validées par un modérateur) — jamais les brouillons ;
//  • seulement les connecteurs cochés, et jamais « Mon cahier » (privé) ;
//  • une note désactivée ou supprimée disparaît de Zem à la synchronisation suivante.
import { Query } from 'node-appwrite';
import { sha1, stableId, purgeBySource } from './store.js';

export const CONNECTOR_PREFIX = 'vanessa-connector:';
export const NOTEBOOK_CONNECTOR_ID = 'mon-cahier';
const MAX_CONTENT = 20000;

// Titre d'une note : sa première phrase (ou ligne), 110 caractères au plus.
export function noteTitle(content) {
    const flat = String(content || '').replace(/\s+/g, ' ').trim();
    const first = flat.split(/(?<=[.!?])\s|\n/)[0] || flat;
    return (first.length > 110 ? first.slice(0, 107).trimEnd() + '…' : first) || 'Note';
}

async function listAll(databases, DB, col, queries, max = 5000) {
    const out = [];
    let cursor = null;
    while (out.length < max) {
        const q = [...queries, Query.limit(100)];
        if (cursor) q.push(Query.cursorAfter(cursor));
        const r = await databases.listDocuments(DB, col, q);
        out.push(...r.documents);
        if (r.documents.length < 100) break;
        cursor = r.documents[r.documents.length - 1].$id;
    }
    return out;
}

export async function syncConnectors({ databases, DB, SOURCES, DOCS, KNOW, CONNECTORS, deadline = Infinity, now = () => Date.now(), onlyConnectorId = '' }) {
    const rows = (await listAll(databases, DB, SOURCES, [])).filter((s) => String(s.url).startsWith(CONNECTOR_PREFIX));
    const summary = { connectors: 0, written: 0, unchanged: 0, removed: 0, done: true, details: [] };
    for (const row of rows) {
        const connectorId = row.url.slice(CONNECTOR_PREFIX.length);
        if (onlyConnectorId && connectorId !== onlyConnectorId) continue;
        if (now() > deadline) { summary.done = false; break; }
        summary.connectors += 1;

        let connector = null;
        try { connector = await databases.getDocument(DB, CONNECTORS, connectorId); } catch { /* connecteur supprimé */ }
        if (!connector || !connector.active || connectorId === NOTEBOOK_CONNECTOR_ID) {
            const p = await purgeBySource(databases, DB, DOCS, row.$id);
            summary.removed += p.removed;
            if (!connector) await databases.deleteDocument(DB, SOURCES, row.$id).catch(() => {});
            else await databases.updateDocument(DB, SOURCES, row.$id, { lastCrawledAt: new Date(now()).toISOString(), lastStatus: 'connecteur désactivé — rien dans Zem', pagesCount: 0 }).catch(() => {});
            summary.details.push({ connectorId, status: 'retiré' });
            continue;
        }

        const existing = new Map((await listAll(databases, DB, DOCS, [Query.equal('sourceId', row.$id), Query.select(['$id', 'contentHash'])])).map((d) => [d.$id, d.contentHash]));
        const seen = new Set();
        let cursor = null;
        let timedOut = false;
        for (;;) {
            const q = [Query.equal('connectorId', connectorId), Query.equal('active', true), Query.limit(100), Query.select(['$id', 'content', 'createdAt'])];
            if (cursor) q.push(Query.cursorAfter(cursor));
            const page = await databases.listDocuments(DB, KNOW, q);
            for (const note of page.documents) {
                const content = String(note.content || '').trim();
                if (content.length < 10) continue;
                const id = stableId('connector-note', note.$id);
                seen.add(id);
                const hash = sha1(content);
                if (existing.get(id) === hash) { summary.unchanged += 1; continue; }
                const data = {
                    url: `zem:note:${note.$id}`,
                    host: 'vanessa',
                    sourceId: row.$id,
                    sourceLabel: connector.name,
                    title: noteTitle(content),
                    description: content.slice(0, 300),
                    content: content.slice(0, MAX_CONTENT),
                    category: row.category || 'autre',
                    city: row.city || '',
                    trust: row.trust || 2,
                    publishedAt: note.createdAt || new Date(now()).toISOString(),
                    crawledAt: new Date(now()).toISOString(),
                    contentHash: hash,
                    lang: 'fr',
                };
                if (existing.has(id)) await databases.updateDocument(DB, DOCS, id, data);
                else await databases.createDocument(DB, DOCS, id, data);
                summary.written += 1;
                if (now() > deadline) { timedOut = true; break; }
            }
            if (timedOut || page.documents.length < 100) break;
            cursor = page.documents[page.documents.length - 1].$id;
        }
        if (timedOut) { summary.done = false; summary.details.push({ connectorId, status: 'interrompu (temps)' }); break; }

        // Passage complet : on retire ce qui n'existe plus (note désactivée ou supprimée).
        for (const id of existing.keys()) {
            if (!seen.has(id)) { await databases.deleteDocument(DB, DOCS, id).catch(() => {}); summary.removed += 1; }
        }
        await databases.updateDocument(DB, SOURCES, row.$id, {
            lastCrawledAt: new Date(now()).toISOString(),
            lastStatus: `ok — ${seen.size} note(s) dans Zem`,
            pagesCount: seen.size,
        }).catch(() => {});
        summary.details.push({ connectorId, status: `ok (${seen.size})` });
    }
    return summary;
}

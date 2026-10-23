// functions/manage-search-sources/src/main.js — Zem
// Gestion des sites que Zem indexe. Réservé aux modérateurs. Appel HTTP depuis la Console :
//   { action: 'list' }
//   { action: 'add', url, label?, category?, city?, trust?, sitemapUrl?, feedUrl?, maxPages? }
//   { action: 'add_many', text }              — une ligne = « adresse | nom | rubrique | ville | confiance »
//   { action: 'update', id, ...champs, active? }
//   { action: 'remove', id }                  — retire le site ET ses pages indexées (par lots)
//   { action: 'stats' }
//   { action: 'missed' }                      — questions qui n'ont donné aucun résultat (les plus fréquentes)
import { Client, Databases, Query, ID } from 'node-appwrite';
import { cleanSource, parseBulk } from './validate.js';

const PURGE_BATCH = 100;
const PURGE_MAX_PER_CALL = 500;

export default async ({ req, res, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) return res.json({ success: false, error: 'Authentification requise.' }, 401);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const USERS = process.env.COLLECTION_USERS;
    const SOURCES = process.env.COLLECTION_SEARCH_SOURCES;
    const DOCS = process.env.COLLECTION_SEARCH_DOCUMENTS;
    const QUERIES = process.env.COLLECTION_SEARCH_QUERIES;

    try {
        const caller = await databases.getDocument(DATABASE_ID, USERS, callerId);
        if (!caller.isModerator) return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action } = body;

        const existingUrls = async () => {
            const r = await databases.listDocuments(DATABASE_ID, SOURCES, [Query.limit(500)]);
            return new Set(r.documents.map((d) => d.url));
        };
        const create = (value) => databases.createDocument(DATABASE_ID, SOURCES, ID.unique(), {
            ...value, active: true, lastCrawledAt: '', lastStatus: 'jamais exploré', pagesCount: 0, createdAt: new Date().toISOString(),
        });

        if (action === 'list') {
            const r = await databases.listDocuments(DATABASE_ID, SOURCES, [Query.orderDesc('$createdAt'), Query.limit(200)]);
            return res.json({ success: true, sources: r.documents });
        }

        if (action === 'add') {
            const c = cleanSource(body);
            if (c.error) return res.json({ success: false, error: c.error }, 400);
            if ((await existingUrls()).has(c.value.url)) return res.json({ success: false, error: 'Ce site est déjà dans la liste.' });
            return res.json({ success: true, source: await create(c.value) });
        }

        if (action === 'add_many') {
            const lines = parseBulk(body.text).slice(0, 100);
            if (!lines.length) return res.json({ success: false, error: 'Aucune ligne à ajouter.' }, 400);
            const known = await existingUrls();
            const added = [];
            const skipped = [];
            for (const l of lines) {
                const c = cleanSource(l);
                if (c.error) { skipped.push({ line: l.url, reason: c.error }); continue; }
                if (known.has(c.value.url)) { skipped.push({ line: l.url, reason: 'déjà dans la liste' }); continue; }
                await create(c.value);
                known.add(c.value.url);
                added.push(c.value.url);
            }
            return res.json({ success: true, added: added.length, skipped });
        }

        if (action === 'update') {
            if (!body.id) return res.json({ success: false, error: 'id requis.' }, 400);
            const current = await databases.getDocument(DATABASE_ID, SOURCES, body.id);
            const patch = {};
            if (typeof body.active === 'boolean') patch.active = body.active;
            const touchesFields = ['url', 'label', 'category', 'city', 'trust', 'sitemapUrl', 'feedUrl', 'maxPages'].some((k) => body[k] !== undefined);
            if (touchesFields) {
                const c = cleanSource({ ...current, ...body });
                if (c.error) return res.json({ success: false, error: c.error }, 400);
                Object.assign(patch, c.value);
            }
            const doc = await databases.updateDocument(DATABASE_ID, SOURCES, body.id, patch);
            return res.json({ success: true, source: doc });
        }

        if (action === 'remove') {
            if (!body.id) return res.json({ success: false, error: 'id requis.' }, 400);
            let removed = 0;
            while (removed < PURGE_MAX_PER_CALL) {
                const batch = await databases.listDocuments(DATABASE_ID, DOCS, [Query.equal('sourceId', body.id), Query.limit(PURGE_BATCH), Query.select(['$id'])]);
                if (!batch.documents.length) break;
                await Promise.all(batch.documents.map((d) => databases.deleteDocument(DATABASE_ID, DOCS, d.$id).catch(() => {})));
                removed += batch.documents.length;
            }
            const left = await databases.listDocuments(DATABASE_ID, DOCS, [Query.equal('sourceId', body.id), Query.limit(1), Query.select(['$id'])]);
            if (left.total > 0) {
                // Beaucoup de pages : le client rappelle jusqu'à ce que « done » soit vrai.
                return res.json({ success: true, done: false, removedPages: removed, remaining: left.total });
            }
            await databases.deleteDocument(DATABASE_ID, SOURCES, body.id);
            return res.json({ success: true, done: true, removedPages: removed });
        }

        if (action === 'stats') {
            const [sources, docs, active] = await Promise.all([
                databases.listDocuments(DATABASE_ID, SOURCES, [Query.limit(1), Query.select(['$id'])]),
                databases.listDocuments(DATABASE_ID, DOCS, [Query.limit(1), Query.select(['$id'])]),
                databases.listDocuments(DATABASE_ID, SOURCES, [Query.equal('active', true), Query.limit(1), Query.select(['$id'])]),
            ]);
            let lastCrawledAt = '';
            try {
                const r = await databases.listDocuments(DATABASE_ID, SOURCES, [Query.orderDesc('lastCrawledAt'), Query.limit(1)]);
                lastCrawledAt = r.documents[0]?.lastCrawledAt || '';
            } catch { /* index absent : on n'affiche pas la date */ }
            return res.json({ success: true, sources: sources.total, activeSources: active.total, pages: docs.total, lastCrawledAt });
        }

        if (action === 'missed') {
            const r = await databases.listDocuments(DATABASE_ID, QUERIES, [Query.equal('resultsCount', 0), Query.orderDesc('$createdAt'), Query.limit(300)]);
            const counts = new Map();
            for (const d of r.documents) counts.set(d.q, (counts.get(d.q) || 0) + 1);
            const missed = [...counts.entries()].map(([q, count]) => ({ q, count })).sort((a, b) => b.count - a.count).slice(0, 40);
            return res.json({ success: true, missed });
        }

        return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
    } catch (err) {
        error(`manage-search-sources : ${err?.message || err}`);
        return res.json({ success: false, error: err?.message || 'Erreur inattendue.' });
    }
};

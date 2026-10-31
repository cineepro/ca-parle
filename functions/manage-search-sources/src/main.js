// functions/manage-search-sources/src/main.js — Zem
// Gestion des sites que Zem indexe. Réservé aux modérateurs. Appel HTTP depuis la Console :
//   { action: 'list' }
//   { action: 'add', url, label?, category?, city?, trust?, sitemapUrl?, feedUrl?, maxPages? }
//   { action: 'add_many', text }              — une ligne = « adresse | nom | rubrique | ville | confiance »
//   { action: 'update', id, ...champs, active? }
//   { action: 'remove', id }                  — retire le site ET ses pages indexées (par lots)
//   { action: 'stats' }
//   { action: 'missed' }                      — questions qui n'ont donné aucun résultat (les plus fréquentes)
//   Fiches manuelles :  { action: 'list_cards' } · { action: 'save_card', id?, title, text, link?, category, city?, trust?, publishedAt? } · { action: 'delete_card', id }
//   Connecteurs dans Zem : { action: 'list_connector_index' } · { action: 'set_connector_index', connectorId, enabled, category?, trust? } · { action: 'sync_connectors' }
//   Statistiques : { action: 'top_clicked' } · { action: 'top_queries' } · { action: 'reports' } (signalements des utilisateurs)
//   Planifié (Appwrite → Function → Settings → Schedule, ex. « 0 * * * * » = chaque heure) : lance sync_connectors tout seul.
import { Client, Databases, Query, ID } from 'node-appwrite';
import { cleanSource, parseBulk } from './validate.js';
import { cleanCard } from './cards.js';
import { syncConnectors, CONNECTOR_PREFIX, NOTEBOOK_CONNECTOR_ID, GENERAL_CONNECTOR_ID, GENERAL_CONNECTOR } from './syncConnectors.js';
import { stableId, sha1, purgeBySource } from './store.js';

const PURGE_BATCH = 100;
const PURGE_MAX_PER_CALL = 500;

export default async ({ req, res, log, error }) => {
    const scheduled = req.headers['x-appwrite-trigger'] === 'schedule';
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId && !scheduled) return res.json({ success: false, error: 'Authentification requise.' }, 401);

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
    const KNOW = process.env.COLLECTION_VANESSA_KNOWLEDGE;
    const CONNECTORS = process.env.COLLECTION_VANESSA_CONNECTORS;
    const EVENTS = process.env.COLLECTION_APP_EVENTS; // facultative : signalements des utilisateurs
    const runSync = (opts = {}) => syncConnectors({ databases, DB: DATABASE_ID, SOURCES, DOCS, KNOW, CONNECTORS, deadline: Date.now() + 40000, ...opts });

    try {
        // Passage planifié par Appwrite : seule la synchronisation des connecteurs, sans appelant.
        if (scheduled && !callerId) {
            const r = await runSync();
            log(`🔄 Zem — connecteurs synchronisés : ${r.written} écrite(s), ${r.unchanged} inchangée(s), ${r.removed} retirée(s)${r.done ? '' : ' (reste à faire au prochain passage)'}`);
            return res.json({ success: true, ...r });
        }
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

        if (action === 'list_cards') {
            const r = await databases.listDocuments(DATABASE_ID, DOCS, [Query.equal('sourceId', 'manuel'), Query.orderDesc('$createdAt'), Query.limit(100)]);
            return res.json({ success: true, cards: r.documents.map((d) => ({
                id: d.$id, title: d.title, text: d.content, link: String(d.url).startsWith('zem:') ? '' : d.url,
                category: d.category, city: d.city || '', trust: d.trust || 3, publishedAt: d.publishedAt || '', clicks: d.clicks || 0,
            })) });
        }

        if (action === 'save_card') {
            const c = cleanCard(body);
            if (c.error) return res.json({ success: false, error: c.error }, 400);
            const v = c.value;
            const nowIso = new Date().toISOString();
            const fields = (id) => ({
                url: v.link || `zem:fiche:${id}`,
                host: v.link ? new URL(v.link).hostname.replace(/^www\./, '') : 'zem',
                sourceId: 'manuel',
                sourceLabel: 'Fiche Zem',
                title: v.title,
                description: v.text.slice(0, 300),
                content: v.text,
                category: v.category,
                city: v.city,
                trust: v.trust,
                publishedAt: v.publishedAt || nowIso,
                crawledAt: nowIso,
                contentHash: sha1(v.text),
                lang: 'fr',
            });
            if (body.id) {
                const current = await databases.getDocument(DATABASE_ID, DOCS, body.id);
                if (current.sourceId !== 'manuel') return res.json({ success: false, error: "Ce n'est pas une fiche manuelle." }, 400);
                const doc = await databases.updateDocument(DATABASE_ID, DOCS, body.id, { ...fields(body.id), publishedAt: v.publishedAt || current.publishedAt || nowIso });
                return res.json({ success: true, id: doc.$id });
            }
            const id = ID.unique();
            const doc = await databases.createDocument(DATABASE_ID, DOCS, id, fields(id));
            return res.json({ success: true, id: doc.$id });
        }

        if (action === 'delete_card') {
            if (!body.id) return res.json({ success: false, error: 'id requis.' }, 400);
            const d = await databases.getDocument(DATABASE_ID, DOCS, body.id);
            if (d.sourceId !== 'manuel') return res.json({ success: false, error: "Ce n'est pas une fiche manuelle." }, 400);
            await databases.deleteDocument(DATABASE_ID, DOCS, body.id);
            return res.json({ success: true });
        }

        if (action === 'list_connector_index') {
            const [conns, rows] = await Promise.all([
                databases.listDocuments(DATABASE_ID, CONNECTORS, [Query.limit(100)]),
                databases.listDocuments(DATABASE_ID, SOURCES, [Query.limit(200)]),
            ]);
            const byConnector = new Map(rows.documents.filter((r) => String(r.url).startsWith(CONNECTOR_PREFIX)).map((r) => [r.url.slice(CONNECTOR_PREFIX.length), r]));
            const everything = [{ $id: GENERAL_CONNECTOR_ID, ...GENERAL_CONNECTOR }, ...conns.documents.filter((c) => c.$id !== NOTEBOOK_CONNECTOR_ID)];
            return res.json({ success: true, connectors: everything.map((c) => {
                const r = byConnector.get(c.$id);
                return {
                    id: c.$id, name: c.name, icon: c.icon, active: !!c.active,
                    enabled: !!r, category: r?.category || 'autre', trust: r?.trust || 2,
                    pagesCount: r?.pagesCount || 0, lastCrawledAt: r?.lastCrawledAt || '', lastStatus: r?.lastStatus || '',
                };
            }) });
        }

        if (action === 'set_connector_index') {
            const connectorId = String(body.connectorId || '');
            if (!connectorId || connectorId === NOTEBOOK_CONNECTOR_ID) return res.json({ success: false, error: 'Ce connecteur ne peut pas être indexé.' }, 400);
            const conn = connectorId === GENERAL_CONNECTOR_ID ? GENERAL_CONNECTOR : await databases.getDocument(DATABASE_ID, CONNECTORS, connectorId);
            const rows = await databases.listDocuments(DATABASE_ID, SOURCES, [Query.limit(200)]);
            const row = rows.documents.find((r) => r.url === `${CONNECTOR_PREFIX}${connectorId}`);
            if (!body.enabled) {
                if (!row) return res.json({ success: true, done: true });
                const p = await purgeBySource(databases, DATABASE_ID, DOCS, row.$id);
                if (p.remaining > 0) return res.json({ success: true, done: false, remaining: p.remaining });
                await databases.deleteDocument(DATABASE_ID, SOURCES, row.$id);
                return res.json({ success: true, done: true });
            }
            const category = cleanSource({ url: 'https://x.bj', category: body.category }).value.category;
            const trust = [1, 2, 3].includes(Number(body.trust)) ? Number(body.trust) : 2;
            if (row) await databases.updateDocument(DATABASE_ID, SOURCES, row.$id, { category, trust, label: conn.name, active: true });
            else await databases.createDocument(DATABASE_ID, SOURCES, ID.unique(), {
                url: `${CONNECTOR_PREFIX}${connectorId}`, label: conn.name, category, city: '', trust, active: true,
                sitemapUrl: '', feedUrl: '', maxPages: 5, lastCrawledAt: '', lastStatus: 'pas encore synchronisé', pagesCount: 0, createdAt: new Date().toISOString(),
            });
            return res.json({ success: true, done: true });
        }

        if (action === 'sync_connectors') {
            const r = await runSync({ onlyConnectorId: String(body.connectorId || '') });
            return res.json({ success: true, ...r });
        }

        if (action === 'top_clicked') {
            try {
                const r = await databases.listDocuments(DATABASE_ID, DOCS, [Query.orderDesc('clicks'), Query.limit(15), Query.select(['$id', 'title', 'url', 'clicks', 'sourceLabel'])]);
                return res.json({ success: true, items: r.documents.filter((d) => (d.clicks || 0) > 0).map((d) => ({ id: d.$id, title: d.title, url: d.url, clicks: d.clicks, sourceLabel: d.sourceLabel || '' })) });
            } catch {
                return res.json({ success: false, error: "Il manque l'attribut « clicks » (Integer, défaut 0) et son index sur search_documents — voir le guide Zem." });
            }
        }

        if (action === 'top_queries') {
            const r = await databases.listDocuments(DATABASE_ID, QUERIES, [Query.orderDesc('$createdAt'), Query.limit(300)]);
            const agg = new Map();
            for (const d of r.documents) {
                const e = agg.get(d.q) || { q: d.q, count: 0, empty: 0 };
                e.count += 1;
                if (!d.resultsCount) e.empty += 1;
                agg.set(d.q, e);
            }
            return res.json({ success: true, total: r.documents.length, queries: [...agg.values()].sort((a, b) => b.count - a.count).slice(0, 30) });
        }

        if (action === 'reports') {
            if (!EVENTS) return res.json({ success: true, reports: [], notConfigured: true });
            const r = await databases.listDocuments(DATABASE_ID, EVENTS, [Query.equal('type', 'zem_report'), Query.orderDesc('createdAt'), Query.limit(50)]);
            return res.json({
                success: true,
                reports: r.documents.map((d) => {
                    let meta = {};
                    try { meta = JSON.parse(d.meta || '{}'); } catch { /* meta illisible */ }
                    return { id: d.$id, message: d.message, url: meta.url || '', docId: meta.docId || '', reason: meta.reason || '', note: meta.note || '', createdAt: d.createdAt };
                }),
            });
        }

        return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
    } catch (err) {
        error(`manage-search-sources : ${err?.message || err}`);
        return res.json({ success: false, error: err?.message || 'Erreur inattendue.' });
    }
};

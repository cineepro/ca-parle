// functions/search-engine/src/main.js — Zem
// Moteur de recherche de Zem. Appel HTTP depuis le client (utilisateur connecté) :
//   { action: 'search', q, category?, city?, page? }  → résultats classés (10 par page)
//   { action: 'home' }                                → rubriques (avec nombre de pages) + dernières pages ajoutées
//   { action: 'browse', category, page? }             → dernières pages d'une rubrique (sans mot cherché)
//   { action: 'read', id }                            → extrait de lecture (≈1 500 caractères) d'une page indexée
//
// Zem ne recherche QUE dans les pages que le robot a indexées depuis les sites choisis
// dans la Console (collection search_documents). Il ne montre que des extraits et renvoie
// toujours vers le site d'origine. Les questions sont enregistrées SANS identifiant
// d'utilisateur (search_queries) pour repérer ce qui manque dans l'index.
import { Client, Databases, Query, ID } from 'node-appwrite';
import { extractQueryWords, wordVariants, rankDocuments, buildSnippet, normalize } from './ranking.js';

const PAGE_SIZE = 10;
const CATEGORIES = ['actualites', 'etudes', 'administration', 'sante', 'emploi', 'marche', 'culture', 'sport', 'services', 'autre'];
const FIELDS = ['$id', 'url', 'host', 'title', 'description', 'content', 'category', 'city', 'trust', 'publishedAt', 'sourceLabel'];

export default async ({ req, res, log, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) return res.json({ success: false, error: 'Authentification requise.' }, 401);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const DOCS = process.env.COLLECTION_SEARCH_DOCUMENTS;
    const QUERIES = process.env.COLLECTION_SEARCH_QUERIES;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action } = body;

        if (action === 'search') {
            const q = String(body.q || '').trim().slice(0, 120);
            if (q.length < 2) return res.json({ success: false, error: 'Écris au moins deux lettres.' }, 400);
            const category = CATEGORIES.includes(body.category) ? body.category : '';
            const city = String(body.city || '').trim().slice(0, 60);
            const page = Math.max(0, Math.min(20, parseInt(body.page, 10) || 0));

            let words = extractQueryWords(q);
            if (!words.length) words = normalize(q).split(/[^a-z0-9]+/).filter((w) => w.length > 1).slice(0, 4);

            const filters = [];
            if (category) filters.push(Query.equal('category', category));

            // Candidats : pour chaque mot (et sa forme sans pluriel), les pages dont le titre
            // ou le texte le contient. Un appel qui échoue (index manquant…) n'arrête pas les autres.
            const calls = [];
            for (const w of words) {
                for (const v of wordVariants(w)) {
                    calls.push(databases.listDocuments(DATABASE_ID, DOCS, [...filters, Query.search('title', v), Query.limit(30), Query.select(FIELDS)]));
                    calls.push(databases.listDocuments(DATABASE_ID, DOCS, [...filters, Query.search('content', v), Query.limit(60), Query.select(FIELDS)]));
                }
            }
            const settled = await Promise.allSettled(calls);
            const okCount = settled.filter((s) => s.status === 'fulfilled').length;
            if (okCount === 0) {
                const why = settled[0]?.reason?.message || 'inconnue';
                error(`Zem : toutes les requêtes de recherche ont échoué (${why}). Vérifier les index fulltext title/content sur search_documents.`);
                return res.json({ success: false, error: 'Zem a un petit souci technique. Réessaie dans un instant.' });
            }
            const byId = new Map();
            for (const s of settled) {
                if (s.status !== 'fulfilled') continue;
                for (const d of s.value.documents) if (!byId.has(d.$id)) byId.set(d.$id, d);
            }
            const candidates = [...byId.values()].slice(0, 200);
            const ranked = rankDocuments(candidates, words, { city });
            const total = ranked.length;
            const slice = ranked.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
            log(`🔎 Zem « ${q} » → mots [${words.join(', ')}], ${candidates.length} candidats, ${total} retenus`);

            if (page === 0 && QUERIES) {
                // Journal anonyme, jamais bloquant.
                databases.createDocument(DATABASE_ID, QUERIES, ID.unique(), {
                    q: normalize(q).slice(0, 120),
                    resultsCount: total,
                    category,
                    createdAt: new Date().toISOString(),
                }).catch(() => {});
            }

            return res.json({
                success: true,
                total,
                page,
                hasMore: (page + 1) * PAGE_SIZE < total,
                words,
                results: slice.map(({ doc, score }) => ({
                    id: doc.$id,
                    url: doc.url,
                    host: doc.host,
                    title: doc.title,
                    snippet: buildSnippet(doc, words),
                    category: doc.category,
                    city: doc.city || '',
                    trust: doc.trust || 1,
                    publishedAt: doc.publishedAt || '',
                    sourceLabel: doc.sourceLabel || doc.host,
                    score: Math.round(score * 10) / 10,
                })),
            });
        }

        if (action === 'home') {
            const counts = await Promise.all(CATEGORIES.map(async (c) => {
                try {
                    const r = await databases.listDocuments(DATABASE_ID, DOCS, [Query.equal('category', c), Query.limit(1), Query.select(['$id'])]);
                    return [c, r.total];
                } catch { return [c, 0]; }
            }));
            let latest = [];
            const pick = (d) => ({
                id: d.$id, url: d.url, host: d.host, title: d.title,
                snippet: buildSnippet(d, []), category: d.category, city: d.city || '',
                trust: d.trust || 1, publishedAt: d.publishedAt || '', sourceLabel: d.sourceLabel || d.host,
            });
            try {
                const r = await databases.listDocuments(DATABASE_ID, DOCS, [Query.orderDesc('publishedAt'), Query.limit(8), Query.select(FIELDS)]);
                latest = r.documents.map(pick);
            } catch {
                try {
                    const r = await databases.listDocuments(DATABASE_ID, DOCS, [Query.orderDesc('$createdAt'), Query.limit(8), Query.select(FIELDS)]);
                    latest = r.documents.map(pick);
                } catch { /* pas de dernières pages : l'accueil s'affiche sans */ }
            }
            return res.json({ success: true, categories: Object.fromEntries(counts), latest });
        }

        if (action === 'browse') {
            const category = CATEGORIES.includes(body.category) ? body.category : '';
            if (!category) return res.json({ success: false, error: 'Rubrique inconnue.' }, 400);
            const page = Math.max(0, Math.min(20, parseInt(body.page, 10) || 0));
            const base = [Query.equal('category', category), Query.limit(PAGE_SIZE), Query.offset(page * PAGE_SIZE), Query.select(FIELDS)];
            let r;
            try {
                r = await databases.listDocuments(DATABASE_ID, DOCS, [...base, Query.orderDesc('publishedAt')]);
            } catch {
                r = await databases.listDocuments(DATABASE_ID, DOCS, [...base, Query.orderDesc('$createdAt')]);
            }
            return res.json({
                success: true, total: r.total, page, hasMore: (page + 1) * PAGE_SIZE < r.total, words: [],
                results: r.documents.map((d) => ({
                    id: d.$id, url: d.url, host: d.host, title: d.title, snippet: buildSnippet(d, []),
                    category: d.category, city: d.city || '', trust: d.trust || 1,
                    publishedAt: d.publishedAt || '', sourceLabel: d.sourceLabel || d.host,
                })),
            });
        }

        if (action === 'read') {
            const id = String(body.id || '');
            if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
            const d = await databases.getDocument(DATABASE_ID, DOCS, id);
            const text = String(d.content || '').replace(/\s+/g, ' ').trim();
            return res.json({
                success: true,
                page: {
                    id: d.$id, url: d.url, title: d.title, host: d.host,
                    sourceLabel: d.sourceLabel || d.host, publishedAt: d.publishedAt || '',
                    excerpt: text.slice(0, 1500) + (text.length > 1500 ? '…' : ''),
                    truncated: text.length > 1500,
                },
            });
        }

        return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
    } catch (err) {
        error(`search-engine : ${err?.message || err}`);
        return res.json({ success: false, error: 'Zem a un petit souci technique. Réessaie dans un instant.' });
    }
};

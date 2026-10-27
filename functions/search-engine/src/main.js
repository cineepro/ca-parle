// functions/search-engine/src/main.js — Zem
// Moteur de recherche de Zem. Appel HTTP depuis le client (utilisateur connecté) :
//   { action: 'search', q, category?, city?, page? }  → résultats classés (10 par page)
//   { action: 'home' }                                → rubriques (avec nombre de pages) + dernières pages ajoutées
//   { action: 'browse', category, page? }             → dernières pages d'une rubrique (sans mot cherché)
//   { action: 'click', id }                           → note qu'un résultat a été ouvert (aide à classer)
//   { action: 'read', id }                            → extrait de lecture (≈1 500 caractères) d'une page indexée
//   { action: 'report', id, reason, note? }           → signale un résultat (faux, dépassé, inapproprié…) à l'équipe
//   { action: 'public_stats' }                        → chiffres publics (pages, sites, dernière mise à jour, recherches)
//
// Zem ne recherche QUE dans les pages que le robot a indexées depuis les sites choisis
// dans la Console (collection search_documents). Il ne montre que des extraits et renvoie
// toujours vers le site d'origine. Les questions sont enregistrées SANS identifiant
// d'utilisateur (search_queries) pour repérer ce qui manque dans l'index.
import { Client, Databases, Query, ID } from 'node-appwrite';
import { extractQueryWords, buildGroups, flattenTerms, correctWords, rankDocuments, buildSnippet, normalize } from './ranking.js';
import { SYNONYMS } from './synonyms.js';
import { getVocab } from './vocab.js';
import { buildAnswer } from './answer.js';

const PAGE_SIZE = 10;
const CATEGORIES = ['actualites', 'etudes', 'administration', 'sante', 'emploi', 'marche', 'culture', 'sport', 'services', 'autre'];
const FIELDS = ['$id', 'url', 'host', 'title', 'description', 'content', 'category', 'city', 'trust', 'publishedAt', 'sourceLabel', 'clicks'];
const MAX_RAW_CALLS = 36; // plafond d'appels à la base pour une seule question

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
    const SOURCES = process.env.COLLECTION_SEARCH_SOURCES; // facultative : liste publique des sites
    const EVENTS = process.env.COLLECTION_APP_EVENTS; // facultative : reçoit les signalements

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

            // Candidats : pour chaque mot (et ses variantes : pluriel, synonymes, accents vus dans
            // l'index), les pages dont le titre ou le texte le contient. Un appel qui échoue
            // (index manquant…) n'arrête pas les autres.
            const retrieve = async (groups) => {
                const calls = [];
                for (const g of groups) {
                    for (const v of g.raw) {
                        if (calls.length >= MAX_RAW_CALLS) break;
                        calls.push(databases.listDocuments(DATABASE_ID, DOCS, [...filters, Query.search('title', v), Query.limit(30), Query.select(FIELDS)]));
                        calls.push(databases.listDocuments(DATABASE_ID, DOCS, [...filters, Query.search('content', v), Query.limit(60), Query.select(FIELDS)]));
                    }
                }
                const settled = await Promise.allSettled(calls);
                const okCount = settled.filter((x) => x.status === 'fulfilled').length;
                const byId = new Map();
                for (const x of settled) {
                    if (x.status !== 'fulfilled') continue;
                    for (const d of x.value.documents) if (!byId.has(d.$id)) byId.set(d.$id, d);
                }
                return { okCount, why: settled.find((x) => x.status === 'rejected')?.reason?.message, docs: [...byId.values()].slice(0, 200) };
            };

            const vocab = await getVocab(databases, DATABASE_ID, DOCS);
            let groups = buildGroups(words, { synonyms: SYNONYMS, vocab });
            let got = await retrieve(groups);
            if (got.okCount === 0) {
                error(`Zem : toutes les requêtes de recherche ont échoué (${got.why || 'inconnue'}). Vérifier les index fulltext title/content sur search_documents.`);
                return res.json({ success: false, error: 'Zem a un petit souci technique. Réessaie dans un instant.' });
            }
            let ranked = rankDocuments(got.docs, groups, { city });
            let corrected = null;

            // Aucun résultat : on essaie de corriger les fautes de frappe avec les mots de l'index.
            if (ranked.length === 0) {
                const fix = correctWords(words, vocab);
                if (fix.changed) {
                    const groups2 = buildGroups(fix.words, { synonyms: SYNONYMS, vocab });
                    const got2 = await retrieve(groups2);
                    const ranked2 = rankDocuments(got2.docs, groups2, { city });
                    if (ranked2.length > 0) {
                        corrected = { from: q, to: fix.words.join(' ') };
                        groups = groups2;
                        ranked = ranked2;
                        got = got2;
                    }
                }
            }
            const candidates = got.docs;
            const shownWords = flattenTerms(groups);
            const total = ranked.length;
            const slice = ranked.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
            log(`🔎 Zem « ${q} » → mots [${words.join(', ')}]${corrected ? ` corrigés en « ${corrected.to} »` : ''}, ${candidates.length} candidats, ${total} retenus`);

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
                words: shownWords,
                corrected,
                // Phrases recopiées des meilleures pages, avec leurs sources — première page seulement.
                answer: page === 0 ? buildAnswer(ranked, groups) : null,
                results: slice.map(({ doc, score }) => ({
                    id: doc.$id,
                    url: doc.url,
                    host: doc.host,
                    title: doc.title,
                    snippet: buildSnippet(doc, groups),
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

        if (action === 'click') {
            const id = String(body.id || '');
            if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
            // Jamais bloquant : si l'attribut « clicks » n'existe pas encore, on ignore.
            try {
                const d = await databases.getDocument(DATABASE_ID, DOCS, id);
                await databases.updateDocument(DATABASE_ID, DOCS, id, { clicks: (Number(d.clicks) || 0) + 1 });
            } catch { /* ignoré */ }
            return res.json({ success: true });
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

        if (action === 'report') {
            const id = String(body.id || '');
            const REASONS = { faux: 'information fausse', depasse: 'information dépassée', inapproprie: 'contenu inapproprié', autre: 'autre problème' };
            const reason = REASONS[body.reason] ? body.reason : 'autre';
            if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
            if (!EVENTS) return res.json({ success: false, error: 'Les signalements ne sont pas encore activés.' });
            const d = await databases.getDocument(DATABASE_ID, DOCS, id).catch(() => null);
            if (!d) return res.json({ success: false, error: 'Page introuvable.' });
            await databases.createDocument(DATABASE_ID, EVENTS, ID.unique(), {
                type: 'zem_report', severity: 'info', source: 'search-engine',
                message: `${REASONS[reason]} : ${String(d.title).slice(0, 200)}`,
                meta: JSON.stringify({ docId: id, url: d.url, reason, note: String(body.note || '').slice(0, 300) }),
                createdAt: new Date().toISOString(),
            });
            return res.json({ success: true });
        }

        if (action === 'public_stats') {
            const since = new Date(Date.now() - 7 * 86400000).toISOString();
            const safe = async (fn, fallback) => { try { return await fn(); } catch { return fallback; } };
            const [pages, last, searches, answered, sources] = await Promise.all([
                safe(async () => (await databases.listDocuments(DATABASE_ID, DOCS, [Query.limit(1), Query.select(['$id'])])).total, 0),
                safe(async () => {
                    try {
                        return (await databases.listDocuments(DATABASE_ID, DOCS, [Query.orderDesc('crawledAt'), Query.limit(1), Query.select(['crawledAt'])])).documents[0]?.crawledAt || '';
                    } catch {
                        return (await databases.listDocuments(DATABASE_ID, DOCS, [Query.orderDesc('$updatedAt'), Query.limit(1), Query.select(['$updatedAt'])])).documents[0]?.$updatedAt || '';
                    }
                }, ''),
                safe(async () => (QUERIES ? (await databases.listDocuments(DATABASE_ID, QUERIES, [Query.greaterThan('createdAt', since), Query.limit(1), Query.select(['$id'])])).total : null), null),
                safe(async () => (QUERIES ? (await databases.listDocuments(DATABASE_ID, QUERIES, [Query.greaterThan('createdAt', since), Query.greaterThan('resultsCount', 0), Query.limit(1), Query.select(['$id'])])).total : null), null),
                safe(async () => {
                    if (!SOURCES) return [];
                    const r = await databases.listDocuments(DATABASE_ID, SOURCES, [Query.equal('active', true), Query.limit(100), Query.select(['label', 'url', 'category'])]);
                    return r.documents.filter((x) => /^https?:/.test(x.url)).map((x) => ({ label: x.label || new URL(x.url).hostname, host: new URL(x.url).hostname.replace(/^www\./, ''), category: x.category || 'autre' }));
                }, []),
            ]);
            return res.json({ success: true, pages, lastUpdateAt: last, searches7d: searches, answered7d: answered, sources });
        }

        return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
    } catch (err) {
        error(`search-engine : ${err?.message || err}`);
        return res.json({ success: false, error: 'Zem a un petit souci technique. Réessaie dans un instant.' });
    }
};

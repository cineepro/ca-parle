// crawler/crawl.js — Zem
// Le robot. À lancer par un programme planifié (GitHub Actions, voir .github/workflows/zem-crawl.yml)
// ou à la main : `npm start` avec les variables d'environnement ci-dessous.
//
//   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY (droits : databases.read/write)
//   DATABASE_ID, COLLECTION_SEARCH_SOURCES, COLLECTION_SEARCH_DOCUMENTS
//   ZEM_MAX_MINUTES (facultatif, 20 par défaut), ZEM_DELAY_MS (facultatif, 1000), ZEM_ONLY_SOURCE (facultatif : id d'un site)
//   ZEM_USER_AGENT (facultatif — mettez-y un moyen de vous joindre, ex. « ZemBot/1.0 (+https://votre-site/zem-bot) »)
import { Client, Databases, Query } from 'node-appwrite';
import { makeFetcher } from './lib/http.js';
import { crawlSource } from './lib/crawlSource.js';

const need = (k) => { if (!process.env[k]) { console.error(`Variable manquante : ${k}`); process.exit(1); } return process.env[k]; };
const client = new Client().setEndpoint(need('APPWRITE_ENDPOINT')).setProject(need('APPWRITE_PROJECT_ID')).setKey(need('APPWRITE_API_KEY'));
const databases = new Databases(client);
const DB = need('DATABASE_ID');
const SOURCES = need('COLLECTION_SEARCH_SOURCES');
const DOCS = need('COLLECTION_SEARCH_DOCUMENTS');

const store = {
    async getDoc(id) { try { return await databases.getDocument(DB, DOCS, id); } catch { return null; } },
    async saveDoc(id, data, exists) {
        if (exists) return databases.updateDocument(DB, DOCS, id, data);
        return databases.createDocument(DB, DOCS, id, data);
    },
    async removeDoc(id) { try { await databases.deleteDocument(DB, DOCS, id); } catch { /* déjà absent */ } },
};

const deadline = Date.now() + Number(process.env.ZEM_MAX_MINUTES || 20) * 60000;
const fetchText = makeFetcher({ delayMs: Number(process.env.ZEM_DELAY_MS || 1000) });

const queries = [Query.equal('active', true), Query.orderAsc('lastCrawledAt'), Query.limit(100)];
const list = await databases.listDocuments(DB, SOURCES, queries);
// Les lignes « vanessa-connector:… » ne sont pas des sites : elles sont traitées par la fonction manage-search-sources.
const sources = list.documents.filter((s) => /^https?:/.test(s.url) && (!process.env.ZEM_ONLY_SOURCE || s.$id === process.env.ZEM_ONLY_SOURCE));
console.log(`🛵 Zem démarre : ${sources.length} site(s) à explorer (le moins récemment visité d'abord).`);

for (const source of sources) {
    if (Date.now() > deadline) { console.log('⏰ Temps alloué écoulé — les sites restants seront faits au prochain passage.'); break; }
    console.log(`\n→ ${source.label || source.url}`);
    let result;
    try {
        result = await crawlSource({ source, fetchText, store, deadline });
    } catch (e) {
        result = { status: `erreur : ${e?.message || e}` };
    }
    console.log(`   ${result.status}`);
    let pagesCount = source.pagesCount || 0;
    try {
        const c = await databases.listDocuments(DB, DOCS, [Query.equal('sourceId', source.$id), Query.limit(1), Query.select(['$id'])]);
        pagesCount = c.total;
    } catch { /* garde l'ancien total */ }
    await databases.updateDocument(DB, SOURCES, source.$id, {
        lastCrawledAt: new Date().toISOString(),
        lastStatus: String(result.status).slice(0, 200),
        pagesCount,
    }).catch((e) => console.error('   (état du site non enregistré)', e.message));
}
console.log('\n✅ Terminé.');

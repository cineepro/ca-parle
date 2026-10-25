import assert from 'node:assert/strict';
import http from 'node:http';
import { makeFetcher } from '../lib/http.js';
import { crawlSource } from '../lib/crawlSource.js';
import { extractPage } from '../lib/extract.js';
import { docIdForUrl } from '../lib/ids.js';
import { readFileSync } from 'node:fs';
const PDF = readFileSync(new URL('./fixtures/communique.pdf', import.meta.url));
const SCAN = readFileSync(new URL('./fixtures/scan.pdf', import.meta.url));

const long = (s) => (s + ' ').repeat(12);
const page = (title, body, extra = '') => `<!doctype html><html lang="fr"><head><title>${title}</title><meta name="description" content="Desc ${title}">${extra}</head><body><nav>MENU INUTILE MENU INUTILE MENU INUTILE MENU INUTILE</nav><article><h1>${title}</h1><p>${body}</p></article><footer>PIED DE PAGE</footer></body></html>`;
let hits = [];
const server = http.createServer((req, res) => {
    hits.push(req.url);
    const send = (code, type, text) => { res.writeHead(code, { 'content-type': type }); res.end(text); };
    const base = `http://127.0.0.1:${server.address().port}`;
    if (req.url === '/robots.txt') return send(200, 'text/plain', 'User-agent: *\nDisallow: /prive\nSitemap: ' + base + '/sitemap.xml');
    if (req.url === '/sitemap.xml') return send(200, 'application/xml', `<urlset><url><loc>${base}/news/a</loc><lastmod>2026-10-20</lastmod></url><url><loc>${base}/news/b</loc><lastmod>2026-09-01</lastmod></url><url><loc>${base}/prive/secret</loc></url><url><loc>${base}/news/noindex</loc></url><url><loc>${base}/news/thin</loc></url><url><loc>${base}/news/gone</loc></url><url><loc>${base}/autre/hors-zone</loc></url><url><loc>${base}/news/tag/x</loc></url></urlset>`);
    if (req.url === '/files/communique.pdf') { res.writeHead(200, { 'content-type': 'application/pdf' }); return res.end(PDF); }
    if (req.url === '/files/scan.pdf') { res.writeHead(200, { 'content-type': 'application/pdf' }); return res.end(SCAN); }
    if (req.url === '/news/a') return send(200, 'text/html', page('Inscriptions ouvertes', long('Les inscriptions à la faculté sont ouvertes pour la rentrée') + ' <a href="/files/communique.pdf">Télécharger le communiqué</a> <a href="/files/scan.pdf">Scan</a>', '<meta property="article:published_time" content="2026-10-19T08:00:00Z">'));
    if (req.url === '/news/b') return send(200, 'text/html', page('Bourse nationale', long('La bourse est versée chaque trimestre aux étudiants')));
    if (req.url === '/news/noindex') return send(200, 'text/html', page('Caché', long('texte'), '<meta name="robots" content="noindex">'));
    if (req.url === '/news/thin') return send(200, 'text/html', page('Mince', 'court'));
    if (req.url === '/prive/secret') return send(200, 'text/html', page('Secret', long('ne jamais lire')));
    return send(404, 'text/plain', 'non');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// --- extraction seule
const ex = extractPage(page('Titre T', long('Contenu utile ici')), 'http://x/');
assert.equal(ex.title, 'Titre T'); assert.ok(!ex.content.includes('MENU INUTILE')); assert.ok(!ex.content.includes('PIED'));
assert.equal(ex.lang, 'fr');

// --- exploration
const db = new Map();
const store = {
    getDoc: async (id) => db.get(id) || null,
    saveDoc: async (id, data, exists) => { db.set(id, exists ? { ...db.get(id), ...data } : { $id: id, ...data }); },
    removeDoc: async (id) => { db.delete(id); },
};
const fetchText = makeFetcher({ delayMs: 0 });
const source = { $id: 'S1', url: `${base}/news`, label: 'Test', category: 'etudes', city: 'Cotonou', trust: 3, maxPages: 40 };
let r = await crawlSource({ source, fetchText, store, log: () => {} });
assert.equal(r.saved, 2, JSON.stringify(r));
assert.equal(r.pdfs, 1, JSON.stringify(r));            // le PDF avec du texte est lu, le scan est ignoré
const pdfDoc = db.get(docIdForUrl(`${base}/files/communique.pdf`));
assert.equal(pdfDoc.title, 'Communiqué bourses 2026'); assert.ok(pdfDoc.content.includes('baccalauréat')); assert.equal(pdfDoc.category, 'etudes'); assert.equal(pdfDoc.trust, 3);
assert.ok(!db.has(docIdForUrl(`${base}/files/scan.pdf`)));
const a = db.get(docIdForUrl(`${base}/news/a`));
assert.equal(a.title, 'Inscriptions ouvertes'); assert.equal(a.category, 'etudes'); assert.equal(a.trust, 3); assert.equal(a.city, 'Cotonou');
assert.equal(a.publishedAt, '2026-10-19T08:00:00.000Z');
assert.equal(db.get(docIdForUrl(`${base}/news/b`)).publishedAt, '2026-09-01T00:00:00.000Z'); // date du sitemap
assert.ok(!hits.includes('/prive/secret'), 'robots.txt non respecté');
assert.ok(!hits.includes('/autre/hors-zone'), 'hors périmètre');
assert.ok(!hits.includes('/news/tag/x'), 'page étiquette ignorée');
assert.equal(r.blocked, 0 + 0); // /prive est hors du préfixe /news : jamais approché
// --- deuxième passage : rien à relire (récent) puis contenu inchangé
hits = [];
r = await crawlSource({ source, fetchText, store, log: () => {} });
assert.equal(r.saved, 0); assert.ok(r.skipped >= 2);
for (const d of db.values()) d.crawledAt = '2020-01-01T00:00:00.000Z';
r = await crawlSource({ source, fetchText, store, log: () => {} });
assert.equal(r.unchanged, 3); assert.equal(r.saved, 0);
// --- une page disparue (404) est retirée de l'index
db.set(docIdForUrl(`${base}/news/gone`), { $id: 'x', url: `${base}/news/gone`, crawledAt: '2020-01-01T00:00:00.000Z', contentHash: 'h' });
r = await crawlSource({ source, fetchText, store, log: () => {} });
assert.equal(db.has(docIdForUrl(`${base}/news/gone`)), false);
// --- robots.txt inaccessible → site ignoré
const dead = await crawlSource({ source: { ...source, url: 'http://127.0.0.1:1/news' }, fetchText, store, log: () => {} });
assert.match(dead.status, /ignoré/);
// --- limite de pages
db.clear();
r = await crawlSource({ source: { ...source, maxPages: 1 }, fetchText, store, log: () => {} });
assert.equal(r.fetched, 1);
server.close();
console.log('robot : OK');

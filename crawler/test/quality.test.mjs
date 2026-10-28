import assert from 'node:assert/strict';
import http from 'node:http';
import { siteHealth, statusLine } from '../lib/health.js';
import { evaluate, isGoodAnswer } from '../lib/evalCore.js';
import { probeSite, reportMarkdown } from '../lib/probe.js';
import { makeFetcher } from '../lib/http.js';

// --- santé d'un site ---
assert.equal(siteHealth({ status: 'ok — 5 pages', fetched: 5, saved: 5, failed: 0, found: 20 }).level, 'ok');
assert.equal(siteHealth({ status: 'robots.txt inaccessible (délai dépassé) — site ignoré' }).level, 'panne');
assert.equal(siteHealth({ status: 'ok — 0', fetched: 4, failed: 4, found: 9 }).level, 'panne');
assert.equal(siteHealth({ status: 'ok — 0', fetched: 0, blocked: 12, found: 12 }).level, 'attention');
assert.equal(siteHealth({ status: 'ok — 0', fetched: 1, found: 1, saved: 0 }).level, 'attention');
assert.equal(siteHealth({ status: 'ok — 0', fetched: 6, failed: 4, saved: 2, found: 30 }).level, 'attention');
assert.match(siteHealth({ status: 'ok — 0', fetched: 5, failed: 0, saved: 0, unchanged: 0, found: 30 }).reason, /structure/);
assert.equal(siteHealth({ status: 'ok — 3', fetched: 3, saved: 3, found: 30 }, { previousPages: 40, pagesNow: 12 }).level, 'attention');
{ // la Console dit POURQUOI les pages échouent
    const h = siteHealth({ status: 'ok — 0', fetched: 2, failed: 2, found: 9, failures: { 'HTTP 403': 2 } });
    assert.equal(h.level, 'panne'); assert.match(h.reason, /HTTP 403 ×2/); assert.match(h.reason, /refuse/);
    assert.match(siteHealth({ status: 'ok — 0', fetched: 2, failed: 2, found: 9, failures: { 'délai dépassé': 2 } }).reason, /délai dépassé ×2/);
    assert.match(siteHealth({ status: 'ok — 0', entryPages: 3, entryLinks: 0, found: 1, fetched: 0 }).reason, /sélecteur/);
    assert.equal(siteHealth({ status: 'ok — 0', entryPages: 0, fetched: 0, found: 1, failures: { 'HTTP 403': 1 } }).level, 'panne');
}
assert.equal(siteHealth({ status: 'ok — 3', fetched: 3, saved: 3, found: 30 }, { previousPages: 8, pagesNow: 2 }).level, 'ok', 'petit site : pas d’alerte sur la baisse');
assert.ok(statusLine({ status: 'ok — fine' }, { level: 'ok' }).startsWith('ok'));
assert.ok(statusLine({ status: 'x' }, { level: 'panne', reason: 'rien' }).startsWith('⛔ panne'));
assert.ok(statusLine({ status: 'x' }, { level: 'attention', reason: 'bof' }).startsWith('⚠️ attention'));

// --- mesure de qualité sur un petit corpus ---
const docs = [
    { $id: '1', host: 'service-public.bj', title: 'Comment obtenir un acte de naissance', content: 'Pour obtenir un acte de naissance, présentez-vous à la mairie avec une pièce d’identité. Acte de naissance gratuit.', trust: 3 },
    { $id: '2', host: 'banouto.bj', title: 'Un bébé naît à Cotonou', content: 'La naissance de ce bébé a été fêtée par toute la famille.', trust: 2 },
    { $id: '3', host: 'impots.bj', title: 'Déclaration d’impôts en ligne', content: 'La déclaration des impôts se fait en ligne sur le portail. Impôts et taxes.', trust: 3 },
    { $id: '4', host: 'officedubacbenin.bj', title: 'Résultats du baccalauréat', content: 'Les résultats du baccalauréat sont publiés. Bac résultats admis.', trust: 3 },
];
const questions = [
    { q: 'comment obtenir un acte de naissance', hosts: ['service-public.bj'], kind: 'démarche' },
    { q: 'acte de naisance', hosts: ['service-public.bj'], kind: 'faute' },
    { q: 'declaration impots', hosts: ['impots.bj'], kind: 'accent' },
    { q: 'résultats du bac', hosts: ['officedubacbenin.bj'], kind: 'synonyme' },
    { q: 'question sans réponse possible xyzzy', hosts: ['nulle-part.bj'], kind: 'absent' },
];
const rep = evaluate(docs, questions);
assert.equal(rep.total, 5);
assert.equal(rep.rows[0].rank, 1);
assert.equal(rep.rows[1].rank, 1, 'la faute de frappe est corrigée');
assert.equal(rep.rows[2].rank, 1);
assert.equal(rep.rows[3].rank, 1, '« bac » trouve « baccalauréat »');
assert.equal(rep.rows[4].rank, null);
assert.equal(rep.top3, 0.8);
assert.equal(rep.failures.length, 1);
assert.equal(isGoodAnswer({ host: 'www.impots.bj', title: '' }, { hosts: ['impots.bj'] }), true);
assert.equal(isGoodAnswer({ host: 'x.bj', title: 'Le Passeport' }, { titleAny: ['passeport'] }), true);

// --- sonde : un faux site qui marche et un qui bloque tout ---
const long = (s) => (s + ' ').repeat(15);
const server = http.createServer((req, res) => {
    const base = `http://127.0.0.1:${server.address().port}`;
    const send = (c, t, b) => { res.writeHead(c, { 'content-type': t }); res.end(b); };
    if (req.url === '/robots.txt') return send(200, 'text/plain', req.headers.host.includes('blocked') ? 'User-agent: *\nDisallow: /' : `Sitemap: ${base}/sitemap.xml`);
    if (req.url === '/sitemap.xml') return send(200, 'application/xml', `<urlset><url><loc>${base}/a</loc></url><url><loc>${base}/b</loc></url><url><loc>${base}/c</loc></url></urlset>`);
    if (['/', '/a', '/b', '/c'].includes(req.url)) return send(200, 'text/html', `<html lang="fr"><head><title>Page ${req.url}</title></head><body><article><h1>Page ${req.url}</h1><p>${long('Texte utile sur les démarches administratives au Bénin')}</p></article></body></html>`);
    return send(404, 'text/plain', 'non');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const fetchText = makeFetcher({ delayMs: 0 });
const base = `http://127.0.0.1:${server.address().port}`;
const good = await probeSite({ source: { url: `${base}/`, label: 'Faux site' }, fetchText, maxPages: 5 });
assert.equal(good.level, 'ok', good.reason);
assert.equal(good.pagesKept >= 3, true);
assert.equal(good.successRate, 100);
const dead = await probeSite({ source: { url: 'http://127.0.0.1:1/', label: 'Mort' }, fetchText, maxPages: 5 });
assert.equal(dead.level, 'panne');
const md = reportMarkdown([{ ...good, category: 'administration', trust: 3 }, dead]);
assert.match(md, /1 sur 2 fonctionnent/);
assert.match(md, /Faux site \| administration/);
server.close();
console.log('✅ qualité : santé, mesure, sonde');

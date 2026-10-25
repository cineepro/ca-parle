// crawler/lib/crawlSource.js — Zem
// Explore UN site : respecte robots.txt, trouve les pages (sitemap → RSS → liens), lit le
// texte, et l'enregistre via `store`. Réseau et base sont injectés : testable sans internet.
import robotsParser from 'robots-parser';
import { extractPage, extractLinks, extractPdfLinks, MIN_CONTENT_CHARS } from './extract.js';
import { extractPdf } from './pdf.js';
import { parseSitemap, parseFeed, sitemapsFromRobots, sortByLastmod, isWorthCrawling } from './discover.js';
import { docIdForUrl, hashContent } from './ids.js';
import { USER_AGENT } from './http.js';

const RECRAWL_DAYS = Number(process.env.ZEM_RECRAWL_DAYS || 3);
const PDF_RECRAWL_DAYS = 30; // un PDF change rarement : on ne le relit qu'une fois par mois
const MAX_PDFS_PER_RUN = Number(process.env.ZEM_MAX_PDFS || 10);
const isPdfUrl = (u) => /\.pdf($|\?)/i.test(u);

export async function crawlSource({ source, fetchText, store, log = console.log, now = () => Date.now(), deadline = Infinity }) {
    const stats = { found: 0, fetched: 0, saved: 0, unchanged: 0, skipped: 0, blocked: 0, failed: 0, pdfs: 0 };
    const pdfQueue = new Map(); // adresse du PDF → texte du lien
    const origin = new URL(source.url).origin;
    const prefix = new URL(source.url).pathname;
    const inScope = (u) => {
        try {
            const x = new URL(u);
            if (x.origin !== origin) return false;
            return prefix.length <= 1 || x.pathname.startsWith(prefix);
        } catch { return false; }
    };

    // 1. robots.txt
    const rob = await fetchText(`${origin}/robots.txt`);
    if (rob.status === 0 || rob.status >= 500) return { ...stats, status: `robots.txt inaccessible (${rob.error || rob.status}) — site ignoré pour cette fois` };
    const robots = robotsParser(`${origin}/robots.txt`, rob.status === 200 ? rob.text : '');
    const allowed = (u) => robots.isAllowed(u, USER_AGENT) !== false;
    const crawlDelay = robots.getCrawlDelay(USER_AGENT);
    if (crawlDelay && crawlDelay > 1) log(`   ⏱️ robots.txt demande ${crawlDelay}s entre deux pages`);

    // 2. Découverte des adresses
    const found = new Map(); // url → lastmod
    const add = (url, lastmod = '') => {
        if (!url || !inScope(url) || !isWorthCrawling(url)) return;
        const u = url.split('#')[0];
        if (!found.has(u)) found.set(u, lastmod);
    };
    add(source.url);

    const sitemapQueue = [];
    if (source.sitemapUrl) sitemapQueue.push(source.sitemapUrl);
    else {
        sitemapQueue.push(...(rob.status === 200 ? sitemapsFromRobots(rob.text) : []));
        if (!sitemapQueue.length) sitemapQueue.push(`${origin}/sitemap.xml`);
    }
    let sitemapsRead = 0;
    const seenSitemaps = new Set();
    while (sitemapQueue.length && sitemapsRead < 8) {
        const sm = sitemapQueue.shift();
        if (seenSitemaps.has(sm)) continue;
        seenSitemaps.add(sm);
        const r = await fetchText(sm);
        sitemapsRead += 1;
        if (r.status !== 200) continue;
        const parsed = parseSitemap(r.text);
        parsed.sitemaps.forEach((s) => sitemapQueue.push(s));
        parsed.urls.forEach((u) => add(u.url, u.lastmod));
    }

    if (found.size <= 1) {
        const feeds = source.feedUrl ? [source.feedUrl] : [`${origin}/feed/`, `${origin}/feed`, `${origin}/rss.xml`];
        for (const f of feeds) {
            const r = await fetchText(f);
            if (r.status !== 200 || !/<(rss|feed|rdf)/i.test(r.text.slice(0, 600))) continue;
            parseFeed(r.text).forEach((i) => add(i.url, i.lastmod));
            if (found.size > 1) break;
        }
    }

    let firstPageHtml = null;
    if (found.size <= 1) {
        // Dernier recours : les liens de la page d'entrée.
        const r = await fetchText(source.url);
        if (r.status === 200) {
            firstPageHtml = r.text;
            extractLinks(r.text, source.url).forEach((l) => add(l));
        }
    }

    stats.found = found.size;
    const ordered = sortByLastmod([...found.entries()].map(([url, lastmod]) => ({ url, lastmod })));

    // 3. Lecture des pages
    const budget = source.maxPages || 40;
    const recrawlMs = RECRAWL_DAYS * 86400000;
    for (const item of ordered) {
        if (stats.fetched >= budget || now() > deadline) break;
        if (!allowed(item.url)) { stats.blocked += 1; continue; }
        if (isPdfUrl(item.url)) { pdfQueue.set(item.url, ''); continue; } // traité plus bas, avec son propre plafond

        const id = docIdForUrl(item.url);
        const existing = await store.getDoc(id);
        if (existing?.crawledAt) {
            const age = now() - Date.parse(existing.crawledAt);
            const modifiedSince = item.lastmod && Date.parse(item.lastmod) > Date.parse(existing.crawledAt);
            if (age < recrawlMs && !modifiedSince) { stats.skipped += 1; continue; }
        }

        const r = (item.url === source.url && firstPageHtml) ? { status: 200, text: firstPageHtml, contentType: 'text/html' } : await fetchText(item.url);
        stats.fetched += 1;
        if (r.status !== 200 || !/html|xml/i.test(r.contentType || 'text/html')) {
            stats.failed += 1;
            if (existing && (r.status === 404 || r.status === 410)) await store.removeDoc(id);
            continue;
        }
        for (const l of extractPdfLinks(r.text, item.url)) if (!pdfQueue.has(l.url)) pdfQueue.set(l.url, l.text);
        const page = extractPage(r.text, item.url);
        if (page.noindex || page.content.length < MIN_CONTENT_CHARS || !page.title) { stats.skipped += 1; continue; }

        const hash = hashContent(page.content);
        if (existing && existing.contentHash === hash) {
            await store.saveDoc(id, { crawledAt: new Date(now()).toISOString() }, true);
            stats.unchanged += 1;
            continue;
        }
        const lastmodIso = item.lastmod && !Number.isNaN(Date.parse(item.lastmod)) ? new Date(item.lastmod).toISOString() : '';
        await store.saveDoc(id, {
            url: item.url,
            host: new URL(item.url).hostname.replace(/^www\./, ''),
            sourceId: source.$id,
            sourceLabel: source.label || '',
            title: page.title,
            description: page.description,
            content: page.content,
            category: source.category || 'autre',
            city: source.city || '',
            trust: source.trust || 2,
            publishedAt: page.publishedAt || lastmodIso,
            crawledAt: new Date(now()).toISOString(),
            contentHash: hash,
            lang: page.lang,
        }, !!existing);
        stats.saved += 1;
    }

    // 4. PDF trouvés (communiqués, avis…) : texte seulement, au plus MAX_PDFS_PER_RUN nouveaux par passage
    let pdfFetched = 0;
    let pdfWarned = false;
    for (const [pdfUrl, linkText] of pdfQueue) {
        if (pdfFetched >= MAX_PDFS_PER_RUN || now() > deadline || !fetchText.bytes) break;
        if (!allowed(pdfUrl)) { stats.blocked += 1; continue; }
        const id = docIdForUrl(pdfUrl);
        const existing = await store.getDoc(id);
        if (existing?.crawledAt && now() - Date.parse(existing.crawledAt) < PDF_RECRAWL_DAYS * 86400000) { stats.skipped += 1; continue; }
        const r = await fetchText.bytes(pdfUrl);
        pdfFetched += 1;
        if (r.status !== 200 || !r.bytes) { stats.failed += 1; continue; }
        let doc;
        try {
            doc = await extractPdf(r.bytes, pdfUrl, linkText);
        } catch (e) {
            stats.failed += 1;
            if (!pdfWarned) { log(`   ⚠️ ${e.message} (version de Node : ${process.version}, il faut la 22 ou plus)`); pdfWarned = true; }
            continue;
        }
        if (!doc) { stats.skipped += 1; continue; } // pas de texte (PDF scanné) ou illisible
        const hash = hashContent(doc.content);
        if (existing && existing.contentHash === hash) { await store.saveDoc(id, { crawledAt: new Date(now()).toISOString() }, true); stats.unchanged += 1; continue; }
        await store.saveDoc(id, {
            url: pdfUrl,
            host: new URL(pdfUrl).hostname.replace(/^www\./, ''),
            sourceId: source.$id,
            sourceLabel: source.label || '',
            title: doc.title,
            description: doc.description,
            content: doc.content,
            category: source.category || 'autre',
            city: source.city || '',
            trust: source.trust || 2,
            publishedAt: doc.publishedAt,
            crawledAt: new Date(now()).toISOString(),
            contentHash: hash,
            lang: 'fr',
        }, !!existing);
        stats.pdfs += 1;
    }
    return { ...stats, status: `ok — ${stats.saved} pages et ${stats.pdfs} PDF nouveaux/modifiés, ${stats.unchanged} inchangés, ${stats.failed} échecs` };
}

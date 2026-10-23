// crawler/lib/discover.js — Zem
// Lecture des « plans » d'un site : sitemap.xml (et index de sitemaps), flux RSS/Atom.
// Pur : reçoit le texte XML, renvoie des adresses. Le réseau est géré par crawl.js.
import * as cheerio from 'cheerio';

export function parseSitemap(xml) {
    const $ = cheerio.load(xml, { xmlMode: true });
    const sitemaps = $('sitemapindex > sitemap > loc').map((_, e) => $(e).text().trim()).get();
    const urls = $('urlset > url').map((_, e) => ({
        url: $(e).children('loc').text().trim(),
        lastmod: $(e).children('lastmod').text().trim(),
    })).get().filter((u) => u.url);
    return { sitemaps, urls };
}

export function parseFeed(xml) {
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];
    $('item').each((_, e) => items.push({ url: $(e).children('link').text().trim(), lastmod: $(e).children('pubDate').text().trim() }));
    $('feed > entry').each((_, e) => {
        const href = $(e).children('link[rel="alternate"]').attr('href') || $(e).children('link').attr('href');
        items.push({ url: (href || '').trim(), lastmod: $(e).children('updated').text().trim() || $(e).children('published').text().trim() });
    });
    return items.filter((i) => i.url);
}

// « Sitemap: ... » dans robots.txt
export function sitemapsFromRobots(txt) {
    return String(txt || '').split(/\r?\n/).map((l) => l.match(/^\s*sitemap:\s*(\S+)/i)?.[1]).filter(Boolean);
}

// Du plus récent au plus ancien (les dates illisibles passent en dernier).
export function sortByLastmod(items) {
    const t = (x) => { const v = Date.parse(x.lastmod); return Number.isNaN(v) ? -1 : v; };
    return [...items].sort((a, b) => t(b) - t(a));
}

// Écarte ce qui ne vaut pas la peine d'être indexé : pages de connexion, panier, recherche interne, étiquettes...
const SKIP_PATH = /(\/(wp-admin|wp-login|login|connexion|cart|panier|checkout|tag|tags|author|feed|search|recherche|wp-json)\b|\?s=|\/page\/\d+\/?$|replytocom=)/i;
export const isWorthCrawling = (url) => !SKIP_PATH.test(url);

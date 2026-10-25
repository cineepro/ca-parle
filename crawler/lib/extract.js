// crawler/lib/extract.js — Zem
// Extrait d'une page HTML : titre, description, date de publication, texte principal.
// Pur (aucun réseau) : testé sur des pages d'exemple.
import * as cheerio from 'cheerio';

const NOISE = 'script,style,noscript,svg,iframe,form,nav,header,footer,aside,button,select,.menu,.nav,.navbar,.sidebar,.widget,.cookie,.cookies,.breadcrumb,.breadcrumbs,.share,.social,.related,.comments,#comments,.pagination';
const MAIN_CANDIDATES = ['article', 'main', '[role=main]', '.entry-content', '.post-content', '.article-content', '.elementor-widget-theme-post-content', '.content', '#content'];
export const MAX_CONTENT_CHARS = 20000;
export const MIN_CONTENT_CHARS = 200;

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function pickDate($) {
    const metas = ['article:published_time', 'og:article:published_time', 'datePublished', 'date', 'DC.date.issued', 'pubdate'];
    for (const m of metas) {
        const v = $(`meta[property="${m}"],meta[name="${m}"],meta[itemprop="${m}"]`).attr('content');
        if (v && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
    }
    const t = $('time[datetime]').first().attr('datetime');
    if (t && !Number.isNaN(Date.parse(t))) return new Date(t).toISOString();
    for (const el of $('script[type="application/ld+json"]').toArray()) {
        try {
            const j = JSON.parse($(el).contents().text());
            const nodes = Array.isArray(j) ? j : j['@graph'] || [j];
            for (const n of nodes) if (n?.datePublished && !Number.isNaN(Date.parse(n.datePublished))) return new Date(n.datePublished).toISOString();
        } catch { /* JSON-LD illisible : on ignore */ }
    }
    return '';
}

export function extractPage(html, pageUrl) {
    const $ = cheerio.load(html);
    const title = clean($('meta[property="og:title"]').attr('content') || $('title').first().text() || $('h1').first().text()).slice(0, 200);
    const description = clean($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content')).slice(0, 400);
    const publishedAt = pickDate($);
    const lang = clean($('html').attr('lang')).slice(0, 8);
    const noindex = /noindex/i.test($('meta[name="robots"]').attr('content') || '');
    const canonicalRaw = $('link[rel="canonical"]').attr('href');
    let canonical = pageUrl;
    try { if (canonicalRaw) canonical = new URL(canonicalRaw, pageUrl).toString(); } catch { /* garde l'adresse reçue */ }

    $(NOISE).remove();
    let root = null;
    for (const sel of MAIN_CANDIDATES) {
        const el = $(sel).first();
        if (el.length && clean(el.text()).length >= MIN_CONTENT_CHARS) { root = el; break; }
    }
    if (!root) root = $('body');
    const parts = [];
    root.find('h1,h2,h3,h4,p,li,td,blockquote').each((_, el) => {
        // Évite de répéter le texte d'un <li> contenant un <p>.
        if ($(el).find('p,li').length) return;
        const t = clean($(el).text());
        if (t.length >= 25 || /^h[1-4]$/i.test(el.tagName)) parts.push(t);
    });
    let content = parts.join('\n');
    if (content.length < MIN_CONTENT_CHARS) content = clean(root.text());
    content = content.slice(0, MAX_CONTENT_CHARS);
    return { title, description, publishedAt, lang, noindex, canonical, content };
}

// Liens internes d'une page (même site), sans ancres ni fichiers lourds.
export function extractLinks(html, pageUrl) {
    const $ = cheerio.load(html);
    const base = new URL(pageUrl);
    const out = new Set();
    $('a[href]').each((_, a) => {
        try {
            const u = new URL($(a).attr('href'), pageUrl);
            if (!['http:', 'https:'].includes(u.protocol) || u.hostname !== base.hostname) return;
            if (/\.(pdf|jpe?g|png|gif|webp|zip|rar|docx?|xlsx?|pptx?|mp3|mp4|avi)$/i.test(u.pathname)) return;
            u.hash = '';
            out.add(u.toString());
        } catch { /* lien invalide */ }
    });
    return [...out];
}

// Liens vers des PDF (même site) trouvés dans une page : [{ url, text }].
export function extractPdfLinks(html, pageUrl) {
    const $ = cheerio.load(html);
    const base = new URL(pageUrl);
    const out = new Map();
    $('a[href]').each((_, a) => {
        try {
            const u = new URL($(a).attr('href'), pageUrl);
            if (!['http:', 'https:'].includes(u.protocol) || u.hostname !== base.hostname || !/\.pdf$/i.test(u.pathname)) return;
            u.hash = '';
            if (!out.has(u.toString())) out.set(u.toString(), clean($(a).text()));
        } catch { /* lien invalide */ }
    });
    return [...out].map(([url, text]) => ({ url, text }));
}

// functions/manage-search-sources/src/validate.js — Zem
// Nettoyage et validation d'un site à indexer (pur, testé à part).
export const CATEGORIES = ['actualites', 'etudes', 'administration', 'sante', 'emploi', 'marche', 'culture', 'sport', 'services', 'autre'];

const cleanUrl = (v) => {
    let u;
    try { u = new URL(String(v || '').trim()); } catch { return null; }
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    // Jamais d'adresse interne : le robot irait les lire depuis le serveur.
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':')) return null;
    if (!h.includes('.')) return null;
    u.hash = '';
    return u.toString();
};

export function cleanSource(input) {
    const url = cleanUrl(input.url);
    if (!url) return { error: `Adresse invalide : ${String(input.url || '').slice(0, 80)}` };
    const sitemapUrl = input.sitemapUrl ? cleanUrl(input.sitemapUrl) : '';
    if (input.sitemapUrl && !sitemapUrl) return { error: 'Adresse du plan du site (sitemap) invalide.' };
    const feedUrl = input.feedUrl ? cleanUrl(input.feedUrl) : '';
    if (input.feedUrl && !feedUrl) return { error: 'Adresse du flux RSS invalide.' };
    const trust = [1, 2, 3].includes(Number(input.trust)) ? Number(input.trust) : 2;
    const maxPages = Math.max(5, Math.min(300, parseInt(input.maxPages, 10) || 40));
    return {
        value: {
            url,
            label: String(input.label || new URL(url).hostname).trim().slice(0, 80),
            category: CATEGORIES.includes(input.category) ? input.category : 'autre',
            city: String(input.city || '').trim().slice(0, 60),
            trust,
            sitemapUrl: sitemapUrl || '',
            feedUrl: feedUrl || '',
            maxPages,
        },
    };
}

// Import en vrac : une ligne = « adresse | nom | rubrique | ville | confiance ».
// Les champs après l'adresse sont facultatifs. Les lignes vides ou commençant par # sont ignorées.
export function parseBulk(text) {
    const out = [];
    for (const line of String(text || '').split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const [url, label, category, city, trust] = t.split('|').map((x) => x.trim());
        out.push({ url, label, category, city, trust });
    }
    return out;
}

// functions/search-engine/src/ranking.js — Zem
// Logique de classement PURE (aucun accès base) pour pouvoir la tester seule.
// Le moteur fonctionne en deux temps : la base (index fulltext Appwrite) ramène
// des candidats, puis ce fichier les NOTE et les ORDONNE avec les règles de Zem :
// mots trouvés (titre > description > texte), part des mots de la question
// couverts, confiance de la source, fraîcheur, bonus ville, et pas plus de
// 2 résultats d'un même site dans les 10 premiers.

export const STOP_WORDS = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'et', 'ou', 'a', 'à', 'au', 'aux', 'en',
    'dans', 'sur', 'pour', 'par', 'avec', 'sans', 'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton',
    'ta', 'tes', 'son', 'sa', 'ses', 'que', 'qui', 'quoi', 'est', 'sont', 'ya', 'y', 'il', 'elle', 'on',
    'je', 'tu', 'nous', 'vous', 'ils', 'elles', 'se', 'si', 'ne', 'pas', 'plus', 'comment', 'quand', 'où',
    'ou', 'quel', 'quelle', 'quels', 'quelles', 'faut', 'fait', 'faire', 'peut', 'puis', 'veux', 'voudrais',
    'cherche', 'trouve', 'donne', 'dis', 'moi', 'toi', 'svp', 'stp', 'au', 'bj', 'benin', 'bénin',
]);

export const stripAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

export const normalize = (s) => stripAccents(s).toLowerCase();

// Mots utiles d'une question (sans accents, sans mots vides, sans doublons).
export function extractQueryWords(q, max = 6) {
    const seen = new Set();
    const out = [];
    for (const raw of normalize(q).split(/[^a-z0-9]+/)) {
        if (raw.length < 2 || STOP_WORDS.has(raw) || /^\d$/.test(raw)) continue;
        if (seen.has(raw)) continue;
        seen.add(raw);
        out.push(raw);
        if (out.length >= max) break;
    }
    return out;
}

// Variantes d'un mot pour la base : lui-même et sa forme sans pluriel.
export function wordVariants(w) {
    const v = new Set([w]);
    if (w.length > 4 && /[sx]$/.test(w)) v.add(w.slice(0, -1));
    return [...v];
}

const countOccurrences = (haystack, needle) => {
    if (!needle) return 0;
    let n = 0;
    let i = haystack.indexOf(needle);
    while (i !== -1) { n += 1; i = haystack.indexOf(needle, i + needle.length); }
    return n;
};

const TRUST_MULTIPLIER = { 1: 1.0, 2: 1.2, 3: 1.4 };

export function freshnessMultiplier(publishedAt, now = Date.now()) {
    if (!publishedAt) return 1;
    const t = Date.parse(publishedAt);
    if (Number.isNaN(t)) return 1;
    const days = (now - t) / 86400000;
    if (days < 0) return 1;
    if (days <= 7) return 1.25;
    if (days <= 30) return 1.15;
    if (days <= 180) return 1.05;
    return 1;
}

// Note d'un document pour une liste de mots. 0 = ne répond pas à la question.
export function scoreDocument(doc, words, { city = '', now = Date.now() } = {}) {
    const title = normalize(doc.title);
    const desc = normalize(doc.description);
    const text = normalize(doc.content);
    if (!words.length) return 0;
    let base = 0;
    let matched = 0;
    for (const w of words) {
        const variants = wordVariants(w);
        let wordScore = 0;
        for (const v of variants) {
            if (title.includes(v)) wordScore = Math.max(wordScore, 4);
            if (desc.includes(v)) wordScore = Math.max(wordScore, 2);
        }
        let occ = 0;
        for (const v of variants) occ = Math.max(occ, countOccurrences(text, v));
        if (occ > 0) wordScore += Math.min(occ, 5);
        if (wordScore > 0) matched += 1;
        base += wordScore;
    }
    if (matched === 0) return 0;
    const coverage = matched / words.length;
    let score = base * coverage * coverage;
    score *= TRUST_MULTIPLIER[doc.trust] || 1;
    score *= freshnessMultiplier(doc.publishedAt, now);
    if (city && doc.city && normalize(doc.city) === normalize(city)) score *= 1.15;
    return score;
}

// Extrait lisible autour du premier mot trouvé (jamais plus de ~220 caractères :
// Zem montre des extraits, pas les pages entières).
export function buildSnippet(doc, words, length = 220) {
    const raw = String(doc.content || doc.description || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    const flat = normalize(raw);
    let pos = -1;
    for (const w of words) {
        for (const v of wordVariants(w)) {
            const p = flat.indexOf(v);
            if (p !== -1 && (pos === -1 || p < pos)) pos = p;
        }
    }
    if (pos === -1) return raw.slice(0, length) + (raw.length > length ? '…' : '');
    const start = Math.max(0, pos - Math.floor(length / 3));
    const end = Math.min(raw.length, start + length);
    return (start > 0 ? '…' : '') + raw.slice(start, end).trim() + (end < raw.length ? '…' : '');
}

// Classe, filtre et diversifie. `maxPerHost` s'applique aux 10 premières places :
// au-delà, les résultats restants gardent leur ordre de note.
export function rankDocuments(docs, words, opts = {}) {
    const { maxPerHost = 2, topWindow = 10 } = opts;
    const scored = docs
        .map((d) => ({ doc: d, score: scoreDocument(d, words, opts) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
    const top = [];
    const rest = [];
    const perHost = new Map();
    for (const x of scored) {
        const n = perHost.get(x.doc.host) || 0;
        if (top.length < topWindow && n < maxPerHost) {
            top.push(x);
            perHost.set(x.doc.host, n + 1);
        } else {
            rest.push(x);
        }
    }
    return [...top, ...rest];
}

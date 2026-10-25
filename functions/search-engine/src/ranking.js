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

// --- Groupes de mots -------------------------------------------------------
// Un « groupe » = un mot de la question + tout ce qui compte pour lui : son pluriel/singulier,
// ses synonymes et les orthographes avec accents vues dans l'index. Une page est « trouvée »
// pour ce mot si UN des termes du groupe y figure. Forme : { terms: [{ t, w }], raw: [...] }
// (t = terme sans accents pour noter, w = poids, raw = orthographes à demander à la base).
export function toGroups(wordsOrGroups) {
    return (wordsOrGroups || []).map((g) => (typeof g === 'string'
        ? { terms: wordVariants(g).map((t) => ({ t, w: 1 })), raw: wordVariants(g) }
        : g));
}

export const flattenTerms = (groups) => [...new Set(toGroups(groups).flatMap((g) => g.terms.map((x) => x.t)))];

// vocab : Map(motSansAccents → { count, spellings:Set }) — voir buildVocab.
export function buildGroups(words, { synonyms = {}, vocab = null, maxRaw = 4 } = {}) {
    return words.map((w) => {
        const terms = new Map(); // t → poids
        const raw = new Set();
        const add = (t, weight) => { if (t && (terms.get(t) || 0) < weight) terms.set(t, weight); };
        for (const v of wordVariants(w)) add(v, 1);
        for (const syn of synonyms[w] || []) for (const v of wordVariants(normalize(syn))) add(v, 0.8);
        for (const t of terms.keys()) {
            raw.add(t);
            for (const sp of vocab?.get(t)?.spellings || []) raw.add(sp); // « universite » → « université »
        }
        return { terms: [...terms].map(([t, wt]) => ({ t, w: wt })), raw: [...raw].slice(0, maxRaw + 2) };
    });
}

// --- Vocabulaire de l'index et correction de fautes -------------------------
export function buildVocab(titles) {
    const vocab = new Map();
    for (const title of titles) {
        for (const orig of String(title || '').toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
            if (orig.length < 3) continue;
            const key = stripAccents(orig);
            const e = vocab.get(key) || { count: 0, spellings: new Set() };
            e.count += 1;
            if (orig !== key) e.spellings.add(orig);
            vocab.set(key, e);
        }
    }
    return vocab;
}

// Distance de Damerau-Levenshtein bornée (échange de deux lettres = 1 faute).
export function editDistance(a, b, max = 2) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
        }
    }
    return d[a.length][b.length];
}

// Remplace les mots inconnus de l'index par le mot connu le plus proche (1 faute pour les mots de
// 4-6 lettres, 2 au-delà). Renvoie { words, changed }.
export function correctWords(words, vocab) {
    if (!vocab || !vocab.size) return { words, changed: false };
    let changed = false;
    const out = words.map((w) => {
        if (vocab.has(w) || vocab.has(w.replace(/[sx]$/, '')) || vocab.has(w + 's') || vocab.has(w + 'x') || w.length < 4) return w;
        const max = w.length >= 7 ? 2 : 1;
        let best = null;
        for (const [cand, e] of vocab) {
            const dist = editDistance(w, cand, max);
            if (dist <= max && (!best || dist < best.dist || (dist === best.dist && e.count > best.count))) best = { cand, dist, count: e.count };
        }
        if (best) { changed = true; return best.cand; }
        return w;
    });
    return { words: out, changed };
}

// Petit coup de pouce aux pages que les gens ouvrent vraiment (plafonné à ×1,3 pour qu'on ne
// puisse pas « gonfler » une page à coups de clics).
export const clicksMultiplier = (clicks) => 1 + Math.min(0.3, Math.log1p(Math.max(0, Number(clicks) || 0)) * 0.06);

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

// Note d'un document pour une liste de mots (ou de groupes). 0 = ne répond pas à la question.
export function scoreDocument(doc, wordsOrGroups, { city = '', now = Date.now() } = {}) {
    const groups = toGroups(wordsOrGroups);
    const title = normalize(doc.title);
    const desc = normalize(doc.description);
    const text = normalize(doc.content);
    if (!groups.length) return 0;
    let base = 0;
    let matched = 0;
    for (const g of groups) {
        let best = 0;
        for (const { t, w } of g.terms) {
            let s = 0;
            if (title.includes(t)) s = Math.max(s, 4);
            if (desc.includes(t)) s = Math.max(s, 2);
            const occ = countOccurrences(text, t);
            if (occ > 0) s += Math.min(occ, 5);
            best = Math.max(best, s * w);
        }
        if (best > 0) matched += 1;
        base += best;
    }
    if (matched === 0) return 0;
    const coverage = matched / groups.length;
    let score = base * coverage * coverage;
    score *= TRUST_MULTIPLIER[doc.trust] || 1;
    score *= freshnessMultiplier(doc.publishedAt, now);
    score *= clicksMultiplier(doc.clicks);
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
    for (const v of flattenTerms(words)) {
        const p = flat.indexOf(v);
        if (p !== -1 && (pos === -1 || p < pos)) pos = p;
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

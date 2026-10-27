// crawler/lib/evalCore.js — Zem
// Mesure la qualité du classement : pour chaque question, la bonne page sort-elle en tête ?
// Utilise EXACTEMENT le classement de la fonction search-engine (mêmes mots, synonymes, fautes).
// La recherche de candidats (fulltext d'Appwrite) est simulée en lisant tout le texte : on mesure donc
// le classement, pas les index d'Appwrite.
import { extractQueryWords, buildGroups, flattenTerms, correctWords, rankDocuments, buildVocab, normalize } from '../../functions/search-engine/src/ranking.js';
import { SYNONYMS } from '../../functions/search-engine/src/synonyms.js';

const host = (h) => String(h || '').toLowerCase().replace(/^www\./, '');

export function isGoodAnswer(doc, q) {
    const hosts = (q.hosts || []).map(host);
    if (hosts.length && hosts.includes(host(doc.host))) return true;
    const title = normalize(doc.title);
    return (q.titleAny || []).some((t) => title.includes(normalize(t)));
}

export function makeSearcher(docs, now = Date.now()) {
    const vocab = buildVocab(docs.map((d) => d.title));
    const prepared = docs.map((d) => ({ d, hay: normalize(`${d.title} ${d.description || ''} ${d.content || ''}`) }));
    const run = (words) => {
        const groups = buildGroups(words, { synonyms: SYNONYMS, vocab });
        const terms = flattenTerms(groups);
        const candidates = prepared.filter((p) => terms.some((t) => p.hay.includes(t))).map((p) => p.d);
        return { groups, ranked: rankDocuments(candidates, groups, { now }) };
    };
    return (query) => {
        let words = extractQueryWords(query);
        if (!words.length) words = normalize(query).split(/[^a-z0-9]+/).filter((w) => w.length > 1).slice(0, 4);
        let out = run(words);
        let corrected = false;
        if (!out.ranked.length) {
            const fix = correctWords(words, vocab);
            if (fix.changed) { out = run(fix.words); corrected = out.ranked.length > 0; }
        }
        return { results: out.ranked.map((x) => x.doc), corrected };
    };
}

export function evaluate(docs, questions, opts = {}) {
    const search = makeSearcher(docs, opts.now);
    const rows = questions.map((q) => {
        const { results, corrected } = search(q.q);
        const rank = results.findIndex((d) => isGoodAnswer(d, q));
        return { q: q.q, kind: q.kind || 'simple', rank: rank === -1 ? null : rank + 1, empty: results.length === 0, corrected, top: results.slice(0, 3).map((d) => d.title) };
    });
    const n = rows.length || 1;
    const within = (k) => rows.filter((r) => r.rank !== null && r.rank <= k).length;
    const byKind = {};
    for (const r of rows) {
        const b = byKind[r.kind] || (byKind[r.kind] = { n: 0, top3: 0 });
        b.n += 1;
        if (r.rank !== null && r.rank <= 3) b.top3 += 1;
    }
    return {
        total: rows.length,
        top1: within(1) / n,
        top3: within(3) / n,
        top10: within(10) / n,
        mrr: rows.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / n,
        noResult: rows.filter((r) => r.empty).length,
        byKind,
        failures: rows.filter((r) => r.rank === null || r.rank > 3),
        rows,
    };
}

export function evalMarkdown(rep, minTop3) {
    const pct = (x) => `${Math.round(x * 100)} %`;
    const lines = [
        `## Qualité de la recherche de Zem — ${rep.total} questions`,
        '',
        `- Bonne page **en première place** : ${pct(rep.top1)}`,
        `- Bonne page **dans les 3 premières** : ${pct(rep.top3)} (objectif : ${pct(minTop3)})`,
        `- Bonne page dans les 10 premières : ${pct(rep.top10)}`,
        `- Questions sans aucun résultat : ${rep.noResult}`,
        '',
        '| Type de question | Nombre | Dans les 3 premières |',
        '|---|---|---|',
        ...Object.entries(rep.byKind).map(([k, v]) => `| ${k} | ${v.n} | ${pct(v.top3 / v.n)} |`),
        '',
    ];
    if (rep.failures.length) {
        lines.push('### Questions à améliorer', '', '| Question | Place de la bonne page | Ce que Zem a mis en tête |', '|---|---|---|');
        for (const f of rep.failures) lines.push(`| ${f.q} | ${f.rank ?? 'absente'} | ${f.empty ? '(aucun résultat)' : f.top.join(' · ')} |`);
        lines.push('');
    }
    return lines.join('\n');
}

// functions/search-engine/src/answer.js — Zem
// « Réponse rapide » : quelques phrases tirées TEXTUELLEMENT des meilleures pages, avec leurs sources.
// Aucune IA, aucun coût : on choisit les phrases qui contiennent le plus de mots de la question.
// Chaque phrase est rattachée à sa source ; Zem ne reformule jamais.
import { normalize, toGroups } from './ranking.js';

const MIN_SENTENCE = 40;
const MAX_SENTENCE = 260;

export function splitSentences(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ0-9«"“(])/u)
        .map((s) => s.trim())
        .filter((s) => s.length >= MIN_SENTENCE);
}

function bestSentence(doc, groups) {
    let best = null;
    for (const sentence of splitSentences(doc.content || doc.description)) {
        const flat = normalize(sentence);
        let matched = 0;
        for (const g of groups) if (g.terms.some(({ t }) => flat.includes(t))) matched += 1;
        if (matched === 0) continue;
        // Plus il y a de mots de la question, mieux c'est ; à égalité, la phrase la plus courte.
        const score = matched * 100 - Math.min(sentence.length, MAX_SENTENCE) / 10;
        if (!best || score > best.score) best = { sentence, matched, score };
    }
    return best;
}

/**
 * ranked : résultats déjà classés ({doc, score}). Renvoie null quand rien ne mérite d'être résumé.
 * Condition : au moins la moitié des mots de la question réunis dans une même phrase.
 */
export function buildAnswer(ranked, wordsOrGroups, { maxSources = 3 } = {}) {
    const groups = toGroups(wordsOrGroups);
    if (!groups.length || !ranked.length) return null;
    const need = Math.max(1, Math.ceil(groups.length / 2));
    const points = [];
    const seenHosts = new Set();
    for (const { doc } of ranked.slice(0, 8)) {
        if (points.length >= maxSources) break;
        if (seenHosts.has(doc.host)) continue;
        const b = bestSentence(doc, groups);
        if (!b || b.matched < need) continue;
        seenHosts.add(doc.host);
        const text = b.sentence.length > MAX_SENTENCE ? `${b.sentence.slice(0, MAX_SENTENCE - 1).trim()}…` : b.sentence;
        points.push({ text, source: { id: doc.$id, title: doc.title, host: doc.host, url: doc.url, sourceLabel: doc.sourceLabel || doc.host } });
    }
    return points.length ? { points } : null;
}

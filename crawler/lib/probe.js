// crawler/lib/probe.js — Zem
// Essai d'un site SANS rien écrire en base : lit quelques pages avec le vrai robot, dit si ça marche.
import { crawlSource } from './crawlSource.js';
import { siteHealth, statusLine } from './health.js';
import { docIdForUrl } from './ids.js';

export async function probeSite({ source, fetchText, maxPages = 8, log = () => {} }) {
    const docs = new Map();
    const store = {
        async getDoc(id) { return docs.get(id) || null; },
        async saveDoc(id, data, exists) { docs.set(id, { ...(docs.get(id) || {}), ...data, $id: id }); return exists; },
        async removeDoc(id) { docs.delete(id); },
    };
    let result;
    const started = Date.now();
    try {
        result = await crawlSource({ source: { ...source, $id: source.$id || docIdForUrl(source.url), maxPages }, fetchText, store, log });
    } catch (e) {
        result = { status: `erreur : ${e?.message || e}` };
    }
    const health = siteHealth(result, { pagesNow: docs.size });
    const pages = [...docs.values()].filter((d) => d.title);
    const attempted = result.fetched || 0;
    return {
        url: source.url,
        label: source.label || source.url,
        level: health.level,
        reason: health.reason,
        line: statusLine(result, health),
        stats: result,
        successRate: attempted ? Math.round(((attempted - (result.failed || 0)) / attempted) * 100) : null,
        pagesKept: pages.length,
        avgChars: pages.length ? Math.round(pages.reduce((n, d) => n + String(d.content || '').length, 0) / pages.length) : 0,
        sample: pages.slice(0, 3).map((d) => ({ title: d.title, url: d.url, chars: String(d.content || '').length })),
        seconds: Math.round((Date.now() - started) / 100) / 10,
    };
}

/** Résumé en tableau (Markdown) pour le journal de l'Action GitHub. */
export function reportMarkdown(reports) {
    const icon = { ok: '✅', attention: '⚠️', panne: '⛔' };
    const ok = reports.filter((r) => r.level === 'ok').length;
    const lines = [
        `## Test des sites de Zem — ${ok} sur ${reports.length} fonctionnent`,
        '',
        '| Site | Verdict | Pages lues | Réussite | Pages gardées | Texte moyen | Remarque |',
        '|---|---|---|---|---|---|---|',
        ...reports.map((r) => `| ${r.label} | ${icon[r.level]} ${r.level} | ${r.stats.fetched ?? 0} | ${r.successRate === null ? '—' : `${r.successRate} %`} | ${r.pagesKept} | ${r.avgChars} car. | ${r.reason || '—'} |`),
        '',
    ];
    const good = reports.filter((r) => r.level === 'ok');
    if (good.length) {
        lines.push('### À coller dans Console → Zem → Sites (« ajouter plusieurs ») — sites qui fonctionnent', '', '```');
        for (const r of good) lines.push(`${r.url} | ${r.label} | ${r.category || 'autre'} | ${r.city || ''} | ${r.trust || 2}`);
        lines.push('```', '');
    }
    return lines.join('\n');
}

// crawler/lib/health.js — Zem
// Après chaque exploration d'un site : « ok », « attention » (le site répond mais quelque chose
// cloche : structure changée, robots.txt qui bloque, pages perdues) ou « panne » (rien n'a marché).
// Le résultat est écrit au début de lastStatus ; le veilleur (platform-watchdog) lit ce début.
export const LEVELS = { ok: 'ok', attention: 'attention', panne: 'panne' };

/** { 'HTTP 403': 2 } → « HTTP 403 ×2 » (les plus fréquents d'abord). */
export function describeFailures(failures = {}) {
    return Object.entries(failures).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} ×${n}`).join(', ');
}
const refusalHint = (failures = {}) => (Object.keys(failures).some((k) => /HTTP (401|403|429)/.test(k)) ? ' — le site refuse sans doute le robot' : '');

export function siteHealth(result, { previousPages = 0, pagesNow = 0 } = {}) {
    const r = result || {};
    const status = String(r.status || '');
    const fetched = r.fetched || 0;
    const failed = r.failed || 0;
    const kept = (r.saved || 0) + (r.unchanged || 0) + (r.pdfs || 0);

    if (!status.startsWith('ok')) return { level: LEVELS.panne, reason: status || 'état inconnu' };
    const why = describeFailures(r.failures);
    if (fetched > 0 && failed >= fetched) return { level: LEVELS.panne, reason: `les ${fetched} pages demandées ont toutes échoué (${why || 'cause inconnue'})${refusalHint(r.failures) || ' — site en panne ou qui nous refuse'}` };
    if ((r.entryPages || 0) === 0 && why && kept === 0 && fetched === 0) return { level: LEVELS.panne, reason: `les pages d'entrée n'ont pas répondu (${why})${refusalHint(r.failures)}` };
    if ((r.entryPages || 0) > 0 && (r.entryLinks || 0) === 0) return { level: LEVELS.attention, reason: 'les pages d’entrée répondent mais le sélecteur n’y trouve aucun lien : la page a peut-être changé (voir site-rules.json)' };
    if ((r.blocked || 0) > 0 && fetched === 0 && (r.found || 0) > 1) return { level: LEVELS.attention, reason: 'robots.txt interdit à Zem de lire ce site' };
    if ((r.found || 0) <= 1 && fetched <= 1 && kept === 0) return { level: LEVELS.attention, reason: 'aucune page trouvée (ni plan du site, ni flux RSS, ni liens) : ajoute l’adresse du plan du site ou du flux RSS' };
    if (fetched >= 5 && failed / fetched > 0.5) return { level: LEVELS.attention, reason: `${failed} pages sur ${fetched} en échec (${why || 'cause inconnue'})` };
    if (fetched >= 3 && kept === 0) return { level: LEVELS.attention, reason: `${fetched} pages lues mais aucun texte exploitable : la structure du site a peut-être changé` };
    if (previousPages >= 10 && pagesNow < previousPages * 0.5) return { level: LEVELS.attention, reason: `le nombre de pages indexées a chuté (${previousPages} → ${pagesNow})` };
    return { level: LEVELS.ok, reason: '' };
}

/** Texte écrit dans lastStatus. Reste « ok — … » quand tout va bien (comme avant). */
export function statusLine(result, health) {
    const base = String(result?.status || '');
    if (health.level === LEVELS.ok) return base.slice(0, 200);
    const icon = health.level === LEVELS.panne ? '⛔ panne' : '⚠️ attention';
    return `${icon} — ${health.reason}`.slice(0, 200);
}

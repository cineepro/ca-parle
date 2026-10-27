// crawler/probe.js — Zem
// Teste des sites AVANT de les ajouter : lit quelques pages avec le vrai robot et dit lesquels marchent.
//   node probe.js                      → teste sites.candidates.json
//   node probe.js https://exemple.bj   → teste une adresse (ou plusieurs)
// Ne demande aucune clé et n'écrit rien dans Appwrite. Écrit probe-report.json et, dans GitHub Actions,
// un tableau dans le résumé de l'exécution.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { makeFetcher } from './lib/http.js';
import { probeSite, reportMarkdown } from './lib/probe.js';

const args = process.argv.slice(2);
const sites = args.length
    ? args.map((url) => ({ url, label: new URL(url).hostname }))
    : JSON.parse(readFileSync(new URL('./sites.candidates.json', import.meta.url), 'utf8'));
const fetchText = makeFetcher({ delayMs: Number(process.env.ZEM_DELAY_MS || 1000) });

const reports = [];
for (const s of sites) {
    process.stdout.write(`→ ${s.label || s.url} … `);
    const r = await probeSite({ source: s, fetchText, maxPages: Number(process.env.ZEM_PROBE_PAGES || 8) });
    reports.push({ ...r, category: s.category, city: s.city, trust: s.trust });
    console.log(`${r.level}${r.reason ? ` — ${r.reason}` : ''} (${r.pagesKept} pages gardées, ${r.seconds} s)`);
}
const md = reportMarkdown(reports);
console.log(`\n${md}`);
writeFileSync('probe-report.json', JSON.stringify(reports, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);

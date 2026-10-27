// crawler/eval/evaluate.js — Zem
// Mesure la qualité de la recherche avec les 50 questions de eval/questions.json.
//   node eval/evaluate.js                      → lit l'index réel dans Appwrite (mêmes variables que le robot)
//   node eval/evaluate.js --corpus pages.json  → lit un fichier [{host,title,description,content,...}]
// Échoue (code 1) si la bonne page est dans les 3 premières pour moins de ZEM_EVAL_MIN_TOP3 % des questions (60 par défaut).
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { evaluate, evalMarkdown } from '../lib/evalCore.js';

const args = process.argv.slice(2);
const corpusFile = args[args.indexOf('--corpus') + 1];
const questions = JSON.parse(readFileSync(new URL('./questions.json', import.meta.url), 'utf8'));
const minTop3 = Number(process.env.ZEM_EVAL_MIN_TOP3 || 60) / 100;

let docs;
if (args.includes('--corpus') && corpusFile) {
    docs = JSON.parse(readFileSync(corpusFile, 'utf8'));
} else {
    const { Client, Databases, Query } = await import('node-appwrite');
    const need = (k) => { if (!process.env[k]) { console.error(`Variable manquante : ${k}`); process.exit(1); } return process.env[k]; };
    const databases = new Databases(new Client().setEndpoint(need('APPWRITE_ENDPOINT')).setProject(need('APPWRITE_PROJECT_ID')).setKey(need('APPWRITE_API_KEY')));
    const DB = need('DATABASE_ID');
    const DOCS = need('COLLECTION_SEARCH_DOCUMENTS');
    docs = [];
    let cursor = null;
    for (;;) {
        const q = [Query.limit(100), Query.select(['$id', 'host', 'title', 'description', 'content', 'category', 'city', 'trust', 'publishedAt', 'clicks'])];
        if (cursor) q.push(Query.cursorAfter(cursor));
        const r = await databases.listDocuments(DB, DOCS, q);
        docs.push(...r.documents);
        if (r.documents.length < 100 || docs.length >= 20000) break;
        cursor = r.documents[r.documents.length - 1].$id;
    }
}
if (!docs.length) { console.error('Aucune page dans l’index : lance d’abord le robot.'); process.exit(1); }
console.log(`${docs.length} pages dans l'index.`);
const report = evaluate(docs, questions);
const md = evalMarkdown(report, minTop3);
console.log(`\n${md}`);
writeFileSync('eval-report.json', JSON.stringify(report, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
if (report.top3 < minTop3) { console.error(`\n❌ Seulement ${Math.round(report.top3 * 100)} % dans les 3 premières (objectif ${Math.round(minTop3 * 100)} %).`); process.exit(1); }
console.log('\n✅ Objectif atteint.');

// scripts/qdrant/search-test.mjs
// Teste la recherche hybride sur de vraies questions, sans toucher à Vanessa.
//   Une question :  node --env-file=scripts/qdrant/.env scripts/qdrant/search-test.mjs "comment s'inscrire à l'UAC ?"
//   Options : --connector=<id>   limiter à un connecteur (ou « general »)
//             --limit=5          nombre de résultats (défaut 5)
//             --debug            affiche aussi les listes « sens seul » et « mots seuls »
//   Fichier de test : --file=scripts/qdrant/questions.json
//     [{ "question": "...", "connectorId": "optionnel", "expected": ["id_de_la_bonne_note", "..."] }]
//     → calcule combien de fois la bonne note est dans les 1, 3, 5, 10 premiers résultats.
import { readFileSync } from 'node:fs';
import { hybridSearch, denseSearch, bm25Search } from './config.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const limit = parseInt(flag('limit') || '5', 10);
const debug = args.includes('--debug');
const file = flag('file');
const oneQuestion = args.filter((a) => !a.startsWith('--')).join(' ').trim();

const line = (p, i) => `  ${String(i + 1).padStart(2)}. [${p.score.toFixed(3)}] ${p.payload.connectorId} · ${p.payload.category} · ${p.payload.noteId}\n      ${String(p.payload.content).replace(/\s+/g, ' ').slice(0, 130)}`;

async function run(question, connectorId) {
    const t0 = Date.now();
    const hits = await hybridSearch(question, { connectorId, limit: Math.max(limit, 10) });
    const ms = Date.now() - t0;
    console.log(`\n❓ ${question}${connectorId ? `  (connecteur : ${connectorId})` : ''}  — ${ms} ms`);
    hits.slice(0, limit).forEach((p, i) => console.log(line(p, i)));
    if (hits.length === 0) console.log('  (aucun résultat)');
    if (debug) {
        console.log('  — sens seul :');
        (await denseSearch(question, { connectorId, limit: 3 })).forEach((p, i) => console.log(line(p, i)));
        console.log('  — mots seuls (BM25) :');
        (await bm25Search(question, { connectorId, limit: 3 })).forEach((p, i) => console.log(line(p, i)));
    }
    return hits;
}

if (file) {
    const cases = JSON.parse(readFileSync(file, 'utf8'));
    const ks = [1, 3, 5, 10];
    const hitsAt = Object.fromEntries(ks.map((k) => [k, 0]));
    let graded = 0;
    for (const c of cases) {
        const hits = await run(c.question, c.connectorId || flag('connector'));
        if (Array.isArray(c.expected) && c.expected.length) {
            graded += 1;
            const rank = hits.findIndex((p) => c.expected.includes(p.payload.noteId));
            console.log(rank >= 0 ? `  ✅ bonne note au rang ${rank + 1}` : '  ❌ bonne note absente des 10 premiers');
            for (const k of ks) if (rank >= 0 && rank < k) hitsAt[k] += 1;
        }
    }
    if (graded) {
        console.log(`\n📊 Sur ${graded} questions notées :`);
        for (const k of ks) console.log(`   bonne note dans le top ${k} : ${hitsAt[k]}/${graded} (${Math.round((100 * hitsAt[k]) / graded)} %)`);
    }
} else if (oneQuestion) {
    await run(oneQuestion, flag('connector'));
} else {
    console.log('Usage : search-test.mjs "ta question" [--connector=id] [--limit=5] [--debug]  |  --file=questions.json');
}
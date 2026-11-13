// scripts/qdrant/calibrate.mjs
// Compare les scores bruts de la recherche (sens et mots) sur les questions de questions.json (avec bonne note)
// et sur des questions HORS SUJET, pour fixer les seuils « rien de pertinent » avant de brancher la recherche dans Vanessa.
//   node --env-file=scripts/qdrant/.env scripts/qdrant/calibrate.mjs
// Utilise EXACTEMENT le module functions/send-message/src/qdrantSearch.js (celui qui sera déployé).
import { readFileSync } from 'node:fs';
import { searchKnowledge } from '../../functions/send-message/src/qdrantSearch.js';

const OFF_TOPIC = [
    'quelle est la recette du gâteau au chocolat ?',
    'qui a gagné la ligue des champions ?',
    "comment réparer l'écran de mon téléphone ?",
    'raconte-moi une blague',
    "c'est quoi le bitcoin ?",
    'quel temps fera-t-il demain à Paris ?',
    'comment apprendre à jouer de la guitare ?',
    'donne-moi des conseils pour maigrir',
    'comment faire un CV pour un emploi en France ?',
    'qui est le président des États-Unis ?',
];

const file = (process.argv.find((a) => a.startsWith('--file=')) || '--file=scripts/qdrant/questions.json').split('=')[1];
const cases = JSON.parse(readFileSync(file, 'utf8')).filter((c) => Array.isArray(c.expected) && c.expected.length);

// Depuis un ordinateur (connexion plus lente que celle d'Appwrite), on laisse 20 s et on réessaie 3 fois.
async function search(question, options) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            return await searchKnowledge(question, { ...options, timeoutMs: 20000 });
        } catch (err) {
            lastError = err;
            console.log(`   ⚠️ tentative ${attempt}/3 échouée (${err.name === 'TimeoutError' ? 'délai dépassé' : err.message})`);
            await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
    }
    throw lastError;
}

const topScores = (res) => {
    const all = [...res.hits, ...res.dropped.map((d) => d.item)];
    const max = (k) => Math.max(0, ...all.map((h) => h[k] ?? 0));
    return { dense: max('dense'), bm25: max('bm25') };
};
const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const fmt = (n) => n.toFixed(2);

const onDense = [], onBm25 = [], offDense = [], offBm25 = [];
const covered = { 1: 0, 3: 0, 8: 0 };
let removedTotal = 0;

console.log('— QUESTIONS AVEC BONNE NOTE —');
for (const c of cases) {
    const res = await search(c.question, { connectorIds: c.connectorId ? [c.connectorId] : [], limit: 8 });
    // La bonne note peut avoir été retirée comme doublon d'une note déjà présente : elle compte alors comme couverte.
    let rank = res.hits.findIndex((h) => c.expected.includes(h.noteId));
    if (rank < 0) {
        const d = res.dropped.find((x) => c.expected.includes(x.item.noteId));
        if (d) rank = res.hits.indexOf(d.duplicateOf);
    }
    const s = topScores(res);
    onDense.push(s.dense); onBm25.push(s.bm25);
    removedTotal += res.dropped.length;
    for (const k of [1, 3, 8]) if (rank >= 0 && rank < k) covered[k] += 1;
    console.log(`${rank >= 0 ? `✅ rang ${rank + 1}` : '❌ absente'} | sens ${fmt(s.dense)} | mots ${fmt(s.bm25)} | doublons retirés ${res.dropped.length} | ${res.ms} ms | ${c.question}`);
}

console.log('\n— QUESTIONS HORS SUJET (rien de pertinent attendu) —');
for (const q of OFF_TOPIC) {
    const res = await search(q, { limit: 8 });
    const s = topScores(res);
    offDense.push(s.dense); offBm25.push(s.bm25);
    console.log(`   sens ${fmt(s.dense)} | mots ${fmt(s.bm25)} | ${q}`);
}

console.log(`\n📊 Bonne note (doublons compris) dans le top 1 : ${covered[1]}/${cases.length}, top 3 : ${covered[3]}/${cases.length}, top 8 : ${covered[8]}/${cases.length} (${removedTotal} doublons retirés au total)`);
const stat = (name, arr) => `${name} : min ${fmt(Math.min(...arr))} · médiane ${fmt(median(arr))} · max ${fmt(Math.max(...arr))}`;
console.log('\nScores du MEILLEUR résultat de chaque question :');
console.log(`  AVEC bonne note   → ${stat('sens', onDense)}   |   ${stat('mots', onBm25)}`);
console.log(`  HORS SUJET        → ${stat('sens', offDense)}   |   ${stat('mots', offBm25)}`);
const sepDense = Math.min(...onDense) > Math.max(...offDense);
const sepBm25 = Math.min(...onBm25) > Math.max(...offBm25);
console.log(`\nSeuil « sens » : ${sepDense ? `séparable, candidat ≈ ${fmt((Math.min(...onDense) + Math.max(...offDense)) / 2)}` : 'les deux groupes se chevauchent (le sens seul ne suffit pas)'}`);
console.log(`Seuil « mots » : ${sepBm25 ? `séparable, candidat ≈ ${fmt((Math.min(...onBm25) + Math.max(...offBm25)) / 2)}` : 'les deux groupes se chevauchent (les mots seuls ne suffisent pas)'}`);
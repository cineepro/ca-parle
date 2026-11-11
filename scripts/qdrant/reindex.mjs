// scripts/qdrant/reindex.mjs
// Synchronise Qdrant avec la collection Appwrite vanessa_knowledge :
//   - lit toutes les notes (lecture seule dans Appwrite) ;
//   - envoie à Qdrant les notes actives (hors lexique / ressources_urgence / publicite) ;
//   - retire de Qdrant les points dont la note est devenue inactive, exclue ou supprimée.
// Relançable à volonté (mêmes identifiants = mise à jour, jamais de doublon).
//   node --env-file=scripts/qdrant/.env scripts/qdrant/reindex.mjs
//   Options : --dry-run (compte sans rien écrire)
import { qdrant, need, COLLECTION, exclusionReason, noteToPoint, noteToPointId } from './config.mjs';

const dryRun = process.argv.includes('--dry-run');
const BATCH = 16;

async function fetchAllNotes() {
    const endpoint = need('APPWRITE_ENDPOINT').replace(/\/+$/, '');
    const project = need('APPWRITE_PROJECT_ID');
    const key = need('APPWRITE_API_KEY');
    const db = need('DATABASE_ID');
    const col = need('COLLECTION_VANESSA_KNOWLEDGE');
    const notes = [];
    let cursor = null;
    for (;;) {
        const params = new URLSearchParams();
        params.append('queries[]', JSON.stringify({ method: 'limit', values: [100] }));
        if (cursor) params.append('queries[]', JSON.stringify({ method: 'cursorAfter', values: [cursor] }));
        const res = await fetch(`${endpoint}/databases/${db}/collections/${col}/documents?${params}`, {
            headers: { 'X-Appwrite-Project': project, 'X-Appwrite-Key': key },
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(`Appwrite ${res.status} : ${(await res.text()).slice(0, 400)}`);
        const docs = (await res.json()).documents || [];
        notes.push(...docs);
        if (docs.length < 100) break;
        cursor = docs[docs.length - 1].$id;
    }
    return notes;
}

console.log('📖 Lecture des notes dans Appwrite...');
const notes = await fetchAllNotes();

const skipped = {};
const perConnector = {};
const toIndex = [];
for (const n of notes) {
    const reason = exclusionReason(n);
    if (reason) { skipped[reason] = (skipped[reason] || 0) + 1; continue; }
    toIndex.push(n);
    const c = n.connectorId || 'general';
    perConnector[c] = (perConnector[c] || 0) + 1;
}
console.log(`   ${notes.length} notes lues → ${toIndex.length} à indexer.`);
console.log('   Écartées :', Object.keys(skipped).length ? JSON.stringify(skipped) : 'aucune');
console.log('   Par connecteur :', JSON.stringify(perConnector));
const tooLong = toIndex.filter((n) => (String(n.content).length + String(n.keywords || '').length) > 2200).length;
if (tooLong) console.log(`   ⚠️ ${tooLong} note(s) très longues : le modèle peut ne lire que le début.`);

if (dryRun) { console.log('\n(dry-run : rien n\'a été écrit dans Qdrant.)'); process.exit(0); }

console.log('\n⬆️ Envoi à Qdrant (Qdrant calcule les vecteurs)...');
let sent = 0;
for (let i = 0; i < toIndex.length; i += BATCH) {
    const points = toIndex.slice(i, i + BATCH).map(noteToPoint);
    await qdrant('PUT', `/collections/${COLLECTION}/points?wait=true`, { points });
    sent += points.length;
    process.stdout.write(`\r   ${sent}/${toIndex.length}`);
}
console.log('');

// Nettoyage : points présents dans Qdrant mais qui ne doivent plus y être.
const keep = new Set(toIndex.map((n) => noteToPointId(n.$id)));
const stale = [];
let offset;
for (;;) {
    const r = await qdrant('POST', `/collections/${COLLECTION}/points/scroll`, {
        limit: 500, with_payload: false, with_vector: false, ...(offset ? { offset } : {}),
    });
    for (const p of r.result.points) if (!keep.has(p.id)) stale.push(p.id);
    offset = r.result.next_page_offset;
    if (!offset) break;
}
if (stale.length) {
    await qdrant('POST', `/collections/${COLLECTION}/points/delete?wait=true`, { points: stale });
}
const count = await qdrant('POST', `/collections/${COLLECTION}/points/count`, { exact: true });
console.log(`🧹 ${stale.length} point(s) obsolète(s) retiré(s).`);
console.log(`✅ Terminé : ${count.result.count} points dans « ${COLLECTION} ».`);
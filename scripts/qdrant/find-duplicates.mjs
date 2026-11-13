// scripts/qdrant/find-duplicates.mjs
// Repère les notes quasi identiques dans vanessa_knowledge (une même information reformulée plusieurs fois).
// Dans chaque groupe, la note la plus longue est conservée.
//   Rapport seul (aucune modification) :
//     node --env-file=scripts/qdrant/.env scripts/qdrant/find-duplicates.mjs
//   Désactiver les doublons (réversible : active = false) :
//     node --env-file=scripts/qdrant/.env scripts/qdrant/find-duplicates.mjs --apply
//   Les supprimer définitivement (irréversible) :
//     node --env-file=scripts/qdrant/.env scripts/qdrant/find-duplicates.mjs --apply --delete
//   Option : --threshold=0.55  (plus haut = plus prudent, moins de doublons détectés)
// Le mode --apply demande APPWRITE_WRITE_API_KEY dans le .env (clé temporaire avec écriture sur les documents).
// Qdrant est mis à jour tout seul par la fonction qdrant-sync.
import { writeFileSync } from 'node:fs';
import { need, exclusionReason } from './config.mjs';
import { fetchRetry } from './net.mjs';
import { contentTokens, jaccard } from '../../functions/send-message/src/qdrantSearch.js';

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const threshold = parseFloat(flag('threshold') || '0.55');
const apply = args.includes('--apply');
const hardDelete = args.includes('--delete');

const endpoint = need('APPWRITE_ENDPOINT').replace(/\/+$/, '');
const project = need('APPWRITE_PROJECT_ID');
const base = `${endpoint}/databases/${need('DATABASE_ID')}/collections/${need('COLLECTION_VANESSA_KNOWLEDGE')}/documents`;

async function fetchAllNotes() {
    const notes = [];
    let cursor = null;
    for (;;) {
        const params = new URLSearchParams();
        params.append('queries[]', JSON.stringify({ method: 'limit', values: [100] }));
        if (cursor) params.append('queries[]', JSON.stringify({ method: 'cursorAfter', values: [cursor] }));
        const res = await fetchRetry(`${base}?${params}`, {
            headers: { 'X-Appwrite-Project': project, 'X-Appwrite-Key': need('APPWRITE_API_KEY') },
        }, { label: 'Lecture Appwrite' });
        if (!res.ok) throw new Error(`Appwrite ${res.status} : ${(await res.text()).slice(0, 300)}`);
        const docs = (await res.json()).documents || [];
        notes.push(...docs);
        if (docs.length < 100) break;
        cursor = docs[docs.length - 1].$id;
    }
    return notes;
}

const snippet = (text, n = 110) => String(text || '').replace(/\s+/g, ' ').slice(0, n);

console.log('📖 Lecture des notes...');
const notes = (await fetchAllNotes()).filter((n) => !exclusionReason(n));
console.log(`   ${notes.length} notes actives et indexables. Seuil de ressemblance : ${threshold}\n`);

// Notes « suspectes » : résumés ratés de l'IA ou du code collé par erreur.
const suspicious = notes.filter((n) => /^\s*(je ne peux pas|je suis désolé|désolé|impossible de)/i.test(n.content) || /base64|<!doctype|<html/i.test(n.content));

// Groupes de doublons : par connecteur, on garde la note la plus longue (puis la plus récente).
const byConnector = new Map();
for (const n of notes) {
    const c = n.connectorId || 'general';
    if (!byConnector.has(c)) byConnector.set(c, []);
    byConnector.get(c).push(n);
}

const duplicates = [];
const perConnector = {};
for (const [connectorId, list] of byConnector) {
    const sorted = [...list].sort((a, b) => String(b.content).length - String(a.content).length || String(b.createdAt).localeCompare(String(a.createdAt)));
    const reps = [];
    for (const n of sorted) {
        const tokens = contentTokens(n.content);
        let best = null;
        for (const r of reps) {
            const s = jaccard(r.tokens, tokens);
            if (s >= threshold && (!best || s > best.s)) best = { r, s };
        }
        if (best) {
            duplicates.push({ id: n.$id, connectorId, keptId: best.r.note.$id, similarity: Math.round(best.s * 100) / 100, snippet: snippet(n.content), keptSnippet: snippet(best.r.note.content) });
        } else {
            reps.push({ note: n, tokens });
        }
    }
    perConnector[connectorId] = { notes: list.length, doublons: duplicates.filter((d) => d.connectorId === connectorId).length };
}

// Rapport lisible, groupé par note conservée
const groups = new Map();
for (const d of duplicates) {
    if (!groups.has(d.keptId)) groups.set(d.keptId, { keptSnippet: d.keptSnippet, connectorId: d.connectorId, removed: [] });
    groups.get(d.keptId).removed.push(d);
}
for (const [keptId, g] of groups) {
    console.log(`✅ GARDÉE ${keptId} (${g.connectorId}) : ${g.keptSnippet}`);
    for (const d of g.removed) console.log(`   ✂️ doublon ${d.id}  (ressemblance ${d.similarity}) : ${d.snippet}`);
    console.log('');
}
if (suspicious.length) {
    console.log('⚠️ Notes suspectes (à vérifier à la main, non modifiées par ce script) :');
    for (const n of suspicious) console.log(`   ${n.$id} (${n.connectorId || 'general'}) : ${snippet(n.content, 90)}`);
    console.log('');
}
console.log('📊 Par connecteur :', JSON.stringify(perConnector));
console.log(`📊 ${duplicates.length} doublon(s) sur ${notes.length} notes, répartis en ${groups.size} groupe(s).`);
writeFileSync('scripts/qdrant/duplicates-report.json', JSON.stringify({ threshold, duplicates, suspicious: suspicious.map((n) => n.$id) }, null, 2));
console.log('📝 Rapport complet : scripts/qdrant/duplicates-report.json');

if (!apply) {
    console.log('\n(Rapport seul : rien n\'a été modifié. Ajoute --apply pour désactiver les doublons.)');
    process.exit(0);
}

const writeKey = need('APPWRITE_WRITE_API_KEY');
console.log(`\n${hardDelete ? '🗑️ SUPPRESSION' : '💤 Désactivation'} de ${duplicates.length} doublon(s)...`);
let done = 0;
for (let i = 0; i < duplicates.length; i += 4) {
    await Promise.all(duplicates.slice(i, i + 4).map(async (d) => {
        const res = await fetchRetry(`${base}/${d.id}`, {
            method: hardDelete ? 'DELETE' : 'PATCH',
            headers: { 'X-Appwrite-Project': project, 'X-Appwrite-Key': writeKey, 'Content-Type': 'application/json' },
            body: hardDelete ? undefined : JSON.stringify({ data: { active: false } }),
        }, { label: `Écriture ${d.id}` });
        if (!res.ok) console.log(`   ❌ ${d.id} : ${res.status} ${(await res.text()).slice(0, 150)}`);
        else done += 1;
    }));
    process.stdout.write(`\r   ${done}/${duplicates.length}`);
}
console.log(`\n✅ Terminé : ${done} note(s) ${hardDelete ? 'supprimée(s)' : 'désactivée(s)'}. qdrant-sync met Qdrant à jour automatiquement.`);
// scripts/qdrant/setup-collection.mjs
// Crée la collection Qdrant de Vanessa et ses index. À lancer UNE fois (relançable sans risque).
//   node --env-file=scripts/qdrant/.env scripts/qdrant/setup-collection.mjs
//   Option : --recreate  → supprime puis recrée la collection (efface tout l'index ; réindexer ensuite).
import { qdrant, COLLECTION, DENSE_VECTOR, DENSE_SIZE, TEXT_FIELD, MIN_QDRANT_VERSION, versionAtLeast } from './config.mjs';

const recreate = process.argv.includes('--recreate');

const info = await qdrant('GET', '/');
console.log(`🔌 Connecté à Qdrant, version ${info.version}`);
if (!versionAtLeast(info.version, MIN_QDRANT_VERSION)) {
    console.error(`❌ Il faut Qdrant ${MIN_QDRANT_VERSION.join('.')} ou plus pour le BM25 sur index full-text (cluster en ${info.version}).`);
    console.error('   Mets le cluster à jour depuis la console Qdrant Cloud, ou dis-moi pour passer à la variante « vecteur BM25 ».');
    process.exit(1);
}

let exists = true;
try { await qdrant('GET', `/collections/${COLLECTION}`); } catch (e) { if (e.status === 404) exists = false; else throw e; }

if (exists && !recreate) {
    console.log(`ℹ️ La collection « ${COLLECTION} » existe déjà : rien à faire (utilise --recreate pour repartir de zéro).`);
    process.exit(0);
}
if (exists && recreate) {
    await qdrant('DELETE', `/collections/${COLLECTION}?wait=true`);
    console.log(`🗑️ Collection « ${COLLECTION} » supprimée.`);
}

// 1. Collection : un seul vecteur dense (multilingual-e5-small = 384 dimensions, similarité cosinus).
await qdrant('PUT', `/collections/${COLLECTION}?wait=true`, {
    vectors: { [DENSE_VECTOR]: { size: DENSE_SIZE, distance: 'Cosine' } },
});
console.log(`✅ Collection « ${COLLECTION} » créée.`);

// 2. Index de payload — créés AVANT d'ajouter les données (recommandé par Qdrant).
const indexes = [
    { field_name: 'connectorId', field_schema: 'keyword' },
    { field_name: 'category', field_schema: 'keyword' },
    { field_name: 'createdAt', field_schema: 'datetime' },
    {
        // BM25 en français : racines (snowball), mots vides, accents ignorés, mots d'au moins 2 lettres.
        field_name: TEXT_FIELD,
        field_schema: {
            type: 'text',
            tokenizer: 'word',
            lowercase: true,
            ascii_folding: true,
            min_token_len: 2,
            stemmer: { type: 'snowball', language: 'french' },
            stopwords: 'french',
            scoring: { type: 'bm25' },
        },
    },
];
for (const idx of indexes) {
    await qdrant('PUT', `/collections/${COLLECTION}/index?wait=true`, idx);
    console.log(`✅ Index « ${idx.field_name} » créé.`);
}

console.log('\n🎉 Prêt. Étape suivante : node --env-file=scripts/qdrant/.env scripts/qdrant/reindex.mjs');
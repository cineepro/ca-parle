// scripts/seedBadges.mjs — Ça Parle
//
// À exécuter UNE FOIS pour peupler la collection `badges` (vide par
// défaut après création dans la console). Nécessite le SDK serveur
// node-appwrite (PAS le SDK client `appwrite` utilisé dans src/) et une
// clé API avec le scope `databases.write`.
//
// Installation : npm install node-appwrite --save-dev
// Exécution    : node scripts/seedBadges.mjs
//
// Variables d'env nécessaires (à mettre dans un .env.local NON commité,
// jamais dans le .env du front — la clé API est un secret serveur) :
//   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
//   APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_BADGES

import { Client, Databases, ID } from 'node-appwrite';

const BADGE_CATALOG = [
    { key: 'lanceur_affaire', name: "Lanceur d'affaire", description: 'A publié sa première histoire', icon: '💥', criteria: 'storiesCount >= 1' },
    { key: 'roi_du_ragot', name: 'Roi du ragot', description: 'A publié 20 histoires', icon: '🔥', criteria: 'storiesCount >= 20' },
    { key: 'detective', name: 'Détective', description: 'A publié 5 révélations', icon: '🏆', criteria: 'revelationsCount >= 5' },
    { key: 'commentateur', name: 'Commentateur', description: 'A publié 10 commentaires', icon: '😂', criteria: 'commentsCount >= 10' },
    { key: 'toujours_au_courant', name: 'Toujours au courant', description: 'A publié 50 commentaires', icon: '👀', criteria: 'commentsCount >= 50' },
    { key: 'source_fiable', name: 'Source fiable', description: 'Indice de fiabilité ≥ 80% sur au moins 5 prédictions', icon: '🔎', criteria: 'reliabilityIndex >= 80 && predictionsTotal >= 5' },
];

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_BADGES = process.env.APPWRITE_COLLECTION_BADGES;

async function seed() {
    for (const badge of BADGE_CATALOG) {
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_BADGES, ID.unique(), badge);
            console.log(`✅ Badge créé : ${badge.name}`);
        } catch (err) {
            console.error(`❌ Échec pour ${badge.name} :`, err.message);
        }
    }
    console.log('Seed terminé.');
}

seed();

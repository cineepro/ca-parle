// scripts/setupUac.mjs — Ça Parle
//
// À exécuter UNE SEULE FOIS (sans danger si relancé : ce qui existe déjà est laissé tel quel).
// Crée les deux collections de l'espace UAC :
//   uac_restaurants : un restaurant = son menu de la semaine (répété chaque semaine)
//   uac_news        : les actualités (concours, location, emploi, soutenance, excursion)
// Lecture réservée aux utilisateurs connectés ; l'écriture passe UNIQUEMENT par la Function manage-uac.
//
//   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... APPWRITE_DATABASE_ID=... \
//   node scripts/setupUac.mjs
// (clé API avec le scope databases.write ; node-appwrite doit être installé : npm install node-appwrite --no-save)
import { Client, Databases, Permission, Role } from 'node-appwrite';

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const DB = process.env.APPWRITE_DATABASE_ID;

const readUsers = [Permission.read(Role.users())];

async function ensureCollection(id, name) {
    try {
        await db.getCollection(DB, id);
        console.log(`✔ Collection ${id} : déjà là`);
    } catch {
        await db.createCollection(DB, id, name, readUsers, false, true);
        console.log(`＋ Collection ${id} créée`);
    }
}

async function attr(collection, key, make) {
    try { await make(); console.log(`   ＋ ${collection}.${key}`); } catch (e) {
        if (e.code === 409) console.log(`   ✔ ${collection}.${key} : déjà là`);
        else throw e;
    }
}
const str = (c, key, size, required = false, def = null) =>
    attr(c, key, () => db.createStringAttribute(DB, c, key, size, required, required ? undefined : (def ?? ''), false));

async function index(collection, key, type, attributes, orders) {
    try { await db.createIndex(DB, collection, key, type, attributes, orders); console.log(`   ＋ index ${key}`); } catch (e) {
        if (e.code === 409) console.log(`   ✔ index ${key} : déjà là`);
        else throw e;
    }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await ensureCollection('uac_restaurants', 'UAC — restaurants');
await str('uac_restaurants', 'name', 80, true);
await str('uac_restaurants', 'place', 120);
await attr('uac_restaurants', 'order', () => db.createIntegerAttribute(DB, 'uac_restaurants', 'order', false, 0, 99, 0));
await attr('uac_restaurants', 'active', () => db.createBooleanAttribute(DB, 'uac_restaurants', 'active', false, true));
await str('uac_restaurants', 'schedule', 6000);
await str('uac_restaurants', 'updatedAt', 40);

await ensureCollection('uac_news', 'UAC — actualités');
await str('uac_news', 'kind', 20, true);
await str('uac_news', 'title', 120, true);
await str('uac_news', 'content', 2000, true);
await str('uac_news', 'contact', 120);
await str('uac_news', 'eventDate', 10);
await str('uac_news', 'imageId', 36);
await str('uac_news', 'authorId', 36, true);
await str('uac_news', 'authorName', 80);
await str('uac_news', 'moderationStatus', 20, true);
await str('uac_news', 'createdAt', 40, true);

console.log('Attente de la création des attributs (Appwrite les prépare en arrière-plan)…');
await wait(8000);
await index('uac_news', 'idx_status_created', 'key', ['moderationStatus', 'createdAt'], ['ASC', 'DESC']);
await index('uac_news', 'idx_kind_status_created', 'key', ['kind', 'moderationStatus', 'createdAt'], ['ASC', 'ASC', 'DESC']);
await index('uac_news', 'idx_author_created', 'key', ['authorId', 'createdAt'], ['ASC', 'DESC']);
await index('uac_restaurants', 'idx_order', 'key', ['order'], ['ASC']);
console.log('\nTerminé. Si un index a échoué parce que les attributs ne sont pas encore prêts, relance simplement le script.');

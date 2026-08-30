// scripts/setupVanessa.mjs — Ça Parle
//
// À exécuter UNE SEULE FOIS pour créer le compte de Vanessa, l'IA de Ça
// Parle. Utilise le SDK serveur node-appwrite avec une clé API (comme
// scripts/seedBadges.mjs).
//
// Installation : npm install node-appwrite --save-dev
// Exécution    :
//   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
//   APPWRITE_DATABASE_ID=... APPWRITE_COLLECTION_USERS=... \
//   node scripts/setupVanessa.mjs
//
// La clé API doit avoir les scopes users.write + databases.write.
// À LA FIN, le script affiche le VANESSA_USER_ID à copier dans :
//   - VITE_APPWRITE_VANESSA_USER_ID (Netlify)
//   - VANESSA_USER_ID (variable d'environnement de chaque Function Vanessa)

import { Client, Users, Databases, ID } from 'node-appwrite';

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);
const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_USERS = process.env.APPWRITE_COLLECTION_USERS;

async function setup() {
    // Un mot de passe aléatoire — Vanessa ne se connecte jamais via un
    // formulaire de login, uniquement via les Functions (clé API). Le
    // mot de passe n'a donc aucune importance opérationnelle.
    const randomPassword = ID.unique() + ID.unique();

    console.log('Création du compte Auth de Vanessa...');
    const authUser = await users.create(
        ID.unique(),
        'vanessa@kinemaplus.com', // email interne, jamais consulté réellement
        undefined,
        randomPassword,
        'Vanessa'
    );

    // Marque l'email comme vérifié directement (pas de vrai email envoyé).
    await users.updateEmailVerification(authUser.$id, true);

    console.log('Création du profil users...');
    await databases.createDocument(DATABASE_ID, COLLECTION_USERS, authUser.$id, {
        userId: authUser.$id,
        name: 'Vanessa',
        email: 'vanessa@kinemaplus.com',
        phone: '',
        bio: "19 ans 🇧🇯🇨🇲🇨🇮 — Je capte tout ce qui se raconte ici. Viens me parler, je garde rien pour moi... enfin, ce que TU me dis reste entre nous 🤫",
        avatarUrl: '',
        followers: 0,
        following: 0,
        isVerified: true,
        isCreative: false,
        isAI: true,
        balance: 0,
        gossipLevel: 6,
        reputationScore: 9999,
        reliabilityIndex: 50,
        storiesCount: 0,
        revelationsCount: 0,
        commentsCount: 0,
        predictionsCorrect: 0,
        predictionsTotal: 0,
        defaultAnonymous: false,
        isModerator: false,
        isBanned: false,
        createdAt: new Date().toISOString(),
    });

    console.log('\n✅ Vanessa est créée.');
    console.log(`\nVANESSA_USER_ID = ${authUser.$id}\n`);
    console.log('Copie cette valeur dans :');
    console.log('  - Netlify : VITE_APPWRITE_VANESSA_USER_ID');
    console.log('  - Functions send-message, vanessa-daily-post, vanessa-checkin : VANESSA_USER_ID');
}

setup().catch((err) => {
    console.error('❌ Échec :', err.message);
    process.exit(1);
});

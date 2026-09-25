// src/api/appwrite.ts — Vanessa
// ⚠️ IMPORTANT : on utilise le MÊME projet Appwrite que Kinema+ pour
// conserver l'Auth (comptes, sessions, vérification email) et les
// utilisateurs déjà inscrits. Ne PAS créer un nouveau projet Appwrite.
import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

if (!projectId) {
    throw new Error('VITE_APPWRITE_PROJECT_ID est manquant dans le .env (doit être le même projet que Kinema+)');
}

export const appwriteConfig = {
    endpoint,
    projectId,
    // Même base de données que Kinema+ : on y ajoute nos nouvelles
    // collections (stories, references, predictions, etc.) à côté des
    // collections historiques (posts, participants...) qui restent
    // inutilisées par Ça Parle.
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || '',
};

if (!appwriteConfig.databaseId) {
    throw new Error('VITE_APPWRITE_DATABASE_ID est manquant dans le .env (doit être la base Kinema+)');
}

export const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export default client;

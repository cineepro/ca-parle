// functions/unsubscribe-newsletter/src/main.js — Vanessa
// Appel HTTP depuis la page publique /unsubscribe :
//   functions.createExecution('unsubscribe-newsletter', JSON.stringify({ userId, token }))
//
// Accessible sans connexion (lien cliqué depuis un email). Le token signé
// (HMAC) empêche qu'un tiers désabonne quelqu'un d'autre en devinant
// simplement son userId.
import { Client, Databases } from 'node-appwrite';
import crypto from 'crypto';

export default async ({ req, res, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const UNSUB_SECRET = process.env.UNSUB_SECRET;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { userId, token } = body;
        if (!userId || !token) {
            return res.json({ success: false, error: 'userId et token requis.' }, 400);
        }

        const expectedToken = crypto.createHmac('sha256', UNSUB_SECRET).update(userId).digest('hex');
        if (token !== expectedToken) {
            return res.json({ success: false, error: 'Lien invalide.' }, 403);
        }

        await databases.updateDocument(DATABASE_ID, COLLECTION_USERS, userId, {
            newsletterOptOut: true,
        });

        return res.json({ success: true });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

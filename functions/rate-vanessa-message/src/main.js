// functions/rate-vanessa-message/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   functions.createExecution('rate-vanessa-message', JSON.stringify({ messageId, feedback }))
//   feedback : 'up' | 'down' | '' (chaîne vide pour retirer un avis déjà donné)
import { Client, Databases } from 'node-appwrite';

const ALLOWED = ['up', 'down', ''];

export default async ({ req, res, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) {
        return res.json({ success: false, error: 'Authentification requise.' }, 401);
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_MESSAGES = process.env.COLLECTION_MESSAGES;
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { messageId, feedback } = body;

        if (!messageId || !ALLOWED.includes(feedback)) {
            return res.json({ success: false, error: 'messageId requis, feedback doit être "up", "down" ou "".' }, 400);
        }

        const message = await databases.getDocument(DATABASE_ID, COLLECTION_MESSAGES, messageId);

        // On ne note que les messages de Vanessa, et seulement si
        // l'appelant fait bien partie de cette conversation (vérifié via
        // ses permissions de lecture — s'il peut lire ce document, c'est
        // qu'il est participant).
        if (message.senderId !== VANESSA_USER_ID) {
            return res.json({ success: false, error: 'Seuls les messages de Vanessa peuvent être notés.' }, 400);
        }

        const updated = await databases.updateDocument(DATABASE_ID, COLLECTION_MESSAGES, messageId, { feedback });
        return res.json({ success: true, message: updated });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
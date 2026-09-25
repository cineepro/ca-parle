// functions/set-vanessa-connector/src/main.js — Vanessa
// Appel HTTP explicite depuis le client :
//   functions.createExecution('set-vanessa-connector', JSON.stringify({ conversationId, connectorId }))
//   connectorId : '' pour revenir en mode "Général" (aucun connecteur).
//
// Change le connecteur actif d'une conversation avec Vanessa — send-message
// s'en sert ensuite pour restreindre sa base de connaissances à CE
// connecteur précis uniquement, tant qu'il reste sélectionné.
import { Client, Databases } from 'node-appwrite';

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
    const COLLECTION_CONVERSATIONS = process.env.COLLECTION_CONVERSATIONS;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { conversationId, connectorId } = body;
        if (!conversationId) {
            return res.json({ success: false, error: 'conversationId requis.' }, 400);
        }

        const conversation = await databases.getDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId);
        if (!conversation.participantIds.includes(callerId)) {
            return res.json({ success: false, error: "Tu ne fais pas partie de cette conversation." }, 403);
        }

        const updated = await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId, {
            vanessaConnectorId: connectorId || '',
        });

        return res.json({ success: true, conversation: updated });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
// functions/set-vanessa-connector/src/main.js — Vanessa
// Appel HTTP explicite depuis le client :
//   functions.createExecution('set-vanessa-connector', JSON.stringify({ conversationId, connectorId }))
//   functions.createExecution('set-vanessa-connector', JSON.stringify({ conversationId, title }))
//   functions.createExecution('set-vanessa-connector', JSON.stringify({ conversationId, hide: true }))
//   connectorId : '' pour revenir en mode "Général" (aucun connecteur).
//
// Change le connecteur actif d'une conversation avec Vanessa — send-message
// s'en sert ensuite pour restreindre sa base de connaissances à CE
// connecteur précis uniquement, tant qu'il reste sélectionné. Gère aussi le
// renommage (title) et la suppression "douce" (hide) d'une conversation —
// même Function, même vérification d'appartenance, pour ne pas dupliquer
// cette logique de sécurité ailleurs.
//
// "Supprimer" une conversation ne l'efface JAMAIS réellement — elle
// disparaît seulement de la liste de la personne qui l'a supprimée
// (hiddenFor), les messages restent intacts en base. Une vraie suppression
// définitive n'est délibérément pas proposée ici.
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
        const { conversationId, connectorId, title, hide } = body;
        if (!conversationId) {
            return res.json({ success: false, error: 'conversationId requis.' }, 400);
        }

        const conversation = await databases.getDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId);
        if (!conversation.participantIds.includes(callerId)) {
            return res.json({ success: false, error: "Tu ne fais pas partie de cette conversation." }, 403);
        }

        const updateData = {};
        if (connectorId !== undefined) updateData.vanessaConnectorId = connectorId || '';
        if (title !== undefined) updateData.title = title.trim().slice(0, 100);
        if (hide === true) {
            const hiddenFor = conversation.hiddenFor || [];
            if (!hiddenFor.includes(callerId)) updateData.hiddenFor = [...hiddenFor, callerId];
        }

        const updated = await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId, updateData);

        return res.json({ success: true, conversation: updated });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
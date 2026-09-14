// functions/manage-vanessa-memory/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client, par l'utilisateur lui-même sur
// SES PROPRES données uniquement (pas d'accès aux souvenirs d'autrui,
// même pour un modérateur — c'est une donnée personnelle, pas de contenu
// à modérer) :
//   { action: 'list' }
//   { action: 'clear' }              — efface TOUTE la mémoire de l'appelant
//   { action: 'delete', memoryId }   — efface un seul fait précis
import { Client, Databases, Query } from 'node-appwrite';

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
    const COLLECTION_VANESSA_MEMORY = process.env.COLLECTION_VANESSA_MEMORY;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action, memoryId } = body;

        switch (action) {
            case 'list': {
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_MEMORY, [
                    Query.equal('userId', callerId),
                    Query.equal('active', true),
                    Query.orderDesc('createdAt'),
                    Query.limit(50),
                ]);
                return res.json({ success: true, memory: result.documents });
            }

            case 'delete': {
                if (!memoryId) return res.json({ success: false, error: 'memoryId requis.' }, 400);
                const doc = await databases.getDocument(DATABASE_ID, COLLECTION_VANESSA_MEMORY, memoryId);
                if (doc.userId !== callerId) {
                    return res.json({ success: false, error: 'Ce souvenir ne t\'appartient pas.' }, 403);
                }
                await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_MEMORY, memoryId, { active: false });
                return res.json({ success: true });
            }

            case 'clear': {
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_MEMORY, [
                    Query.equal('userId', callerId),
                    Query.equal('active', true),
                    Query.limit(100),
                ]);
                await Promise.allSettled(
                    result.documents.map((doc) => databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_MEMORY, doc.$id, { active: false }))
                );
                return res.json({ success: true, cleared: result.documents.length });
            }

            default:
                return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
        }
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
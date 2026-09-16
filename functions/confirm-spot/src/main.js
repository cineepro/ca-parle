// functions/confirm-spot/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   functions.createExecution('confirm-spot', JSON.stringify({ spotId }))
//
// Bascule : si l'appelant a déjà confirmé cette fiche, sa confirmation est
// retirée ; sinon elle est ajoutée. L'unicité (un seul avis par personne et
// par fiche) est garantie par l'ID du document lui-même (`${spotId}_${userId}`),
// pas par une requête de vérification séparée — Appwrite refuse nativement
// un ID déjà existant, donc pas de double confirmation possible même en cas
// de double clic rapide.
import { Client, Databases, ID } from 'node-appwrite';

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
    const COLLECTION_LOCAL_SPOTS = process.env.COLLECTION_LOCAL_SPOTS;
    const COLLECTION_SPOT_CONFIRMATIONS = process.env.COLLECTION_SPOT_CONFIRMATIONS;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { spotId } = body;
        if (!spotId) {
            return res.json({ success: false, error: 'spotId requis.' }, 400);
        }

        const spot = await databases.getDocument(DATABASE_ID, COLLECTION_LOCAL_SPOTS, spotId);
        const confirmationId = `${spotId}_${callerId}`;

        let confirmed;
        try {
            // Existe déjà → l'appelant retire sa confirmation.
            await databases.getDocument(DATABASE_ID, COLLECTION_SPOT_CONFIRMATIONS, confirmationId);
            await databases.deleteDocument(DATABASE_ID, COLLECTION_SPOT_CONFIRMATIONS, confirmationId);
            await databases.updateDocument(DATABASE_ID, COLLECTION_LOCAL_SPOTS, spotId, {
                confirmCount: Math.max(0, (spot.confirmCount || 0) - 1),
            });
            confirmed = false;
        } catch {
            // N'existe pas encore → on l'ajoute.
            await databases.createDocument(DATABASE_ID, COLLECTION_SPOT_CONFIRMATIONS, confirmationId, {
                spotId, userId: callerId, createdAt: new Date().toISOString(),
            });
            await databases.updateDocument(DATABASE_ID, COLLECTION_LOCAL_SPOTS, spotId, {
                confirmCount: (spot.confirmCount || 0) + 1,
            });
            confirmed = true;
        }

        return res.json({ success: true, confirmed });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
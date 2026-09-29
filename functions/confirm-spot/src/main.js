// functions/confirm-spot/src/main.js — Vanessa
// Appel HTTP explicite depuis le client :
//   functions.createExecution('confirm-spot', JSON.stringify({ spotId }))
//
// Bascule : si l'appelant a déjà confirmé cette fiche, sa confirmation est
// retirée ; sinon elle est ajoutée. L'unicité (un seul avis par personne et
// par fiche) est vérifiée par une requête (spotId + userId), pas par un ID
// de document composite — un ID Appwrite classique fait déjà ~20 caractères,
// deux mis bout à bout dépassent systématiquement la limite de 36 caractères
// qu'Appwrite impose aux identifiants de document (c'était la vraie cause de
// l'échec : pas un cas rare, un cas garanti dès qu'un utilisateur avait un
// identifiant de longueur normale).
import { Client, Databases, ID, Query } from 'node-appwrite';

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

        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_SPOT_CONFIRMATIONS, [
            Query.equal('spotId', spotId),
            Query.equal('userId', callerId),
            Query.limit(1),
        ]);

        let confirmed;
        if (existing.documents.length > 0) {
            // Déjà confirmé → l'appelant retire sa confirmation.
            await databases.deleteDocument(DATABASE_ID, COLLECTION_SPOT_CONFIRMATIONS, existing.documents[0].$id);
            await databases.updateDocument(DATABASE_ID, COLLECTION_LOCAL_SPOTS, spotId, {
                confirmCount: Math.max(0, (spot.confirmCount || 0) - 1),
            });
            confirmed = false;
        } else {
            await databases.createDocument(DATABASE_ID, COLLECTION_SPOT_CONFIRMATIONS, ID.unique(), {
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
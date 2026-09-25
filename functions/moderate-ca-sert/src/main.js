// functions/moderate-ca-sert/src/main.js — Vanessa
// Réservé aux modérateurs (isModerator === true sur le document `users`).
//   { action: 'list_pending' }
//   { action: 'approve', type: 'spot'|'price', id }
//   { action: 'reject',  type: 'spot'|'price', id }
//
// ⚠️ C'est CETTE Function, avec la clé API serveur, qui peut lire les
// contributions "en attente" — leurs permissions, posées côté client au
// moment de la création, ne les rendent lisibles que par leur propre
// auteur. La clé API serveur contourne les permissions Appwrite, donc
// list_pending voit tout, peu importe qui l'a créé.
import { Client, Databases, Query, Permission, Role } from 'node-appwrite';

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
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const COLLECTION_LOCAL_SPOTS = process.env.COLLECTION_LOCAL_SPOTS;
    const COLLECTION_MARKET_PRICES = process.env.COLLECTION_MARKET_PRICES;

    const collectionFor = (type) => (type === 'spot' ? COLLECTION_LOCAL_SPOTS : COLLECTION_MARKET_PRICES);

    try {
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action, type, id } = body;

        switch (action) {
            case 'list_pending': {
                const [spots, prices] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, COLLECTION_LOCAL_SPOTS, [
                        Query.equal('moderationStatus', 'attente'),
                        Query.orderAsc('createdAt'),
                        Query.limit(50),
                    ]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_MARKET_PRICES, [
                        Query.equal('moderationStatus', 'attente'),
                        Query.orderAsc('createdAt'),
                        Query.limit(50),
                    ]),
                ]);
                return res.json({ success: true, spots: spots.documents, prices: prices.documents });
            }

            case 'approve': {
                if (!type || !id) return res.json({ success: false, error: 'type et id requis.' }, 400);
                const collectionId = collectionFor(type);
                const doc = await databases.getDocument(DATABASE_ID, collectionId, id);

                // Élargit la lecture à tout le monde, MAINTENANT que c'est
                // validé — c'est le seul moment où cette fiche devient
                // publique. L'auteur garde en plus son droit de modifier.
                const updated = await databases.updateDocument(
                    DATABASE_ID, collectionId, id,
                    { moderationStatus: 'visible' },
                    [Permission.read(Role.any()), Permission.update(Role.user(doc.authorId))]
                );
                return res.json({ success: true, document: updated });
            }

            case 'reject': {
                if (!type || !id) return res.json({ success: false, error: 'type et id requis.' }, 400);
                const collectionId = collectionFor(type);
                // Permissions inchangées volontairement : l'auteur garde le
                // droit de voir que sa contribution a été refusée, mais
                // elle ne devient jamais publique.
                const updated = await databases.updateDocument(DATABASE_ID, collectionId, id, {
                    moderationStatus: 'refuse',
                });
                return res.json({ success: true, document: updated });
            }

            default:
                return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
        }
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
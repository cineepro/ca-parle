// functions/list-message-feedback/src/main.js — Vanessa
// Appel HTTP explicite depuis le client (modérateur uniquement) :
//   functions.createExecution('list-message-feedback', JSON.stringify({ type: 'down'|'up', limit? }))
//
// Ferme la boucle du 👍👎 : ce feedback était jusqu'ici enregistré sur
// chaque message (voir rate-vanessa-message) mais jamais relu nulle part.
// Cette Function ramène, pour chaque réponse notée, la question qui l'a
// précédée dans la même conversation — sans ce contexte, un 👎 isolé ne
// dit pas grand-chose.
import { Client, Databases, Query } from 'node-appwrite';

const DEFAULT_LIMIT = 30;

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
    const COLLECTION_MESSAGES = process.env.COLLECTION_MESSAGES;
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;

    try {
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const type = body.type === 'up' ? 'up' : 'down'; // 👎 par défaut — c'est ce qu'on vient corriger en priorité
        const limit = Math.min(body.limit || DEFAULT_LIMIT, 50);

        const result = await databases.listDocuments(DATABASE_ID, COLLECTION_MESSAGES, [
            Query.equal('senderId', VANESSA_USER_ID),
            Query.equal('feedback', type),
            Query.orderDesc('createdAt'),
            Query.limit(limit),
        ]);

        // Pour chaque réponse notée, va chercher le message juste avant
        // elle dans la même conversation — la question qui l'a provoquée.
        const withContext = await Promise.all(result.documents.map(async (msg) => {
            try {
                const preceding = await databases.listDocuments(DATABASE_ID, COLLECTION_MESSAGES, [
                    Query.equal('conversationId', msg.conversationId),
                    Query.lessThan('createdAt', msg.createdAt),
                    Query.orderDesc('createdAt'),
                    Query.limit(1),
                ]);
                return {
                    $id: msg.$id,
                    conversationId: msg.conversationId,
                    reply: msg.content,
                    createdAt: msg.createdAt,
                    question: preceding.documents[0]?.content || null,
                };
            } catch {
                return { $id: msg.$id, conversationId: msg.conversationId, reply: msg.content, createdAt: msg.createdAt, question: null };
            }
        }));

        return res.json({ success: true, messages: withContext });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
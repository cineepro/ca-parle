// functions/manage-vanessa-knowledge/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   functions.createExecution('manage-vanessa-knowledge', JSON.stringify({ action, id, category, content, active }))
//   action ∈ 'list' | 'create' | 'update' | 'delete'
//
// SÉCURITÉ : réservé aux modérateurs (vérifié via x-appwrite-user-id).
// Toute la collection vanessa_knowledge est verrouillée à 0 permission
// côté client — cette Function est la SEULE porte d'entrée, précisément
// parce qu'une note ici alimente directement le prompt de l'IA (une
// injection malveillante dans cette base serait une vraie faille).
import { Client, Databases, Query, ID } from 'node-appwrite';

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
    const COLLECTION_VANESSA_KNOWLEDGE = process.env.COLLECTION_VANESSA_KNOWLEDGE;

    try {
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action, id, category, content, active } = body;

        switch (action) {
            case 'list': {
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                    Query.orderDesc('createdAt'),
                    Query.limit(100),
                ]);
                return res.json({ success: true, documents: result.documents });
            }
            case 'create': {
                if (!category || !content) {
                    return res.json({ success: false, error: 'category et content requis.' }, 400);
                }
                const doc = await databases.createDocument(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, ID.unique(), {
                    category, content,
                    active: active !== undefined ? active : true,
                    createdAt: new Date().toISOString(),
                });
                return res.json({ success: true, document: doc });
            }
            case 'update': {
                if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
                const updateData = {};
                if (category !== undefined) updateData.category = category;
                if (content !== undefined) updateData.content = content;
                if (active !== undefined) updateData.active = active;
                const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, id, updateData);
                return res.json({ success: true, document: doc });
            }
            case 'delete': {
                if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
                await databases.deleteDocument(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, id);
                return res.json({ success: true });
            }
            default:
                return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
        }
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

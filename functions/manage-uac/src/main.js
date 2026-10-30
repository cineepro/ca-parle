// functions/manage-uac/src/main.js — Vanessa
// Espace UAC (onglet « UAC » de Ça Parle).
//   Tout utilisateur connecté (non banni) :
//     { action: 'publish_news', kind, title, content, contact?, eventDate?, imageId? }
//     { action: 'delete_news', id }            (auteur ou modérateur)
//   Modérateurs (isModerator === true) :
//     { action: 'hide_news', id } / { action: 'show_news', id }
//     { action: 'list_news_all' }              (visibles + masquées, pour la Console)
//     { action: 'save_restaurant', id?, name, place, order, active, schedule }
//     { action: 'delete_restaurant', id }
// La lecture du menu et des actualités visibles se fait directement depuis l'app (permission de lecture « utilisateurs »).
import { Client, Databases, ID, Query } from 'node-appwrite';
import { MAX_NEWS_PER_DAY, validateNews, validateRestaurant } from './lib.js';

export default async ({ req, res, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) return res.json({ success: false, error: 'Authentification requise.' }, 401);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    const DB = process.env.DATABASE_ID;
    const USERS = process.env.COLLECTION_USERS;
    const NEWS = process.env.COLLECTION_UAC_NEWS;
    const RESTOS = process.env.COLLECTION_UAC_RESTAURANTS;

    try {
        const caller = await databases.getDocument(DB, USERS, callerId);
        if (caller.isBanned) return res.json({ success: false, error: 'Ton compte ne peut pas publier.' }, 403);
        const isMod = !!caller.isModerator;
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action, id } = body;
        const needMod = () => (isMod ? null : res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403));

        switch (action) {
            case 'publish_news': {
                const checked = validateNews(body);
                if (checked.error) return res.json({ success: false, error: checked.error }, 400);
                const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
                const recent = await databases.listDocuments(DB, NEWS, [
                    Query.equal('authorId', callerId), Query.greaterThan('createdAt', since), Query.limit(MAX_NEWS_PER_DAY),
                ]);
                if (recent.total >= MAX_NEWS_PER_DAY) {
                    return res.json({ success: false, error: `Tu as déjà publié ${MAX_NEWS_PER_DAY} actualités aujourd’hui. Reviens demain.` }, 429);
                }
                const doc = await databases.createDocument(DB, NEWS, ID.unique(), {
                    ...checked.value,
                    authorId: callerId,
                    authorName: String(caller.pseudo || caller.name || '').slice(0, 80),
                    moderationStatus: 'visible',
                    createdAt: new Date().toISOString(),
                });
                return res.json({ success: true, document: doc });
            }

            case 'delete_news': {
                if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
                const doc = await databases.getDocument(DB, NEWS, id);
                if (doc.authorId !== callerId && !isMod) return res.json({ success: false, error: 'Tu ne peux supprimer que tes propres actualités.' }, 403);
                await databases.deleteDocument(DB, NEWS, id);
                return res.json({ success: true });
            }

            case 'hide_news':
            case 'show_news': {
                const denied = needMod(); if (denied) return denied;
                if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
                await databases.updateDocument(DB, NEWS, id, { moderationStatus: action === 'hide_news' ? 'masque' : 'visible' });
                return res.json({ success: true });
            }

            case 'list_news_all': {
                const denied = needMod(); if (denied) return denied;
                const list = await databases.listDocuments(DB, NEWS, [Query.orderDesc('createdAt'), Query.limit(60)]);
                return res.json({ success: true, documents: list.documents });
            }

            case 'save_restaurant': {
                const denied = needMod(); if (denied) return denied;
                const checked = validateRestaurant(body);
                if (checked.error) return res.json({ success: false, error: checked.error }, 400);
                const doc = id
                    ? await databases.updateDocument(DB, RESTOS, id, { ...checked.value, updatedAt: new Date().toISOString() })
                    : await databases.createDocument(DB, RESTOS, ID.unique(), { ...checked.value, updatedAt: new Date().toISOString() });
                return res.json({ success: true, document: doc });
            }

            case 'delete_restaurant': {
                const denied = needMod(); if (denied) return denied;
                if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
                await databases.deleteDocument(DB, RESTOS, id);
                return res.json({ success: true });
            }

            default:
                return res.json({ success: false, error: 'Action inconnue.' }, 400);
        }
    } catch (err) {
        error(`manage-uac: ${err.message}`);
        return res.json({ success: false, error: 'Une erreur est survenue.' }, 500);
    }
};

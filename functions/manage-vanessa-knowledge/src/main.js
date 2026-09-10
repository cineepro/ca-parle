// functions/manage-vanessa-knowledge/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   Notes   : { action: 'list'|'create'|'update'|'delete', id?, category?, content?, active?, connectorId? }
//   Connecteurs (modérateur) : { action: 'list_connectors'|'create_connector'|'update_connector'|'delete_connector', id?, name?, slug?, icon?, color?, description?, active? }
//   Connecteurs (public)     : { action: 'list_active_connectors' }
//
// SÉCURITÉ : toutes les actions sont réservées aux modérateurs, SAUF
// 'list_active_connectors' — volontairement publique (juste authentifiée),
// car c'est elle qui alimente les pastilles de connecteurs affichées à
// TOUS les utilisateurs dans le chat avec Vanessa. Elle ne renvoie que des
// champs d'affichage (nom, icône, couleur, description), jamais le
// contenu des notes elles-mêmes.
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
    const COLLECTION_VANESSA_CONNECTORS = process.env.COLLECTION_VANESSA_CONNECTORS;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action } = body;

        // Seule action accessible à tout utilisateur authentifié, pas
        // seulement aux modérateurs — nécessaire pour afficher les
        // pastilles de connecteurs dans le chat.
        if (action === 'list_active_connectors') {
            const result = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, [
                Query.equal('active', true),
                Query.orderAsc('name'),
                Query.limit(50),
            ]);
            const safe = result.documents.map((c) => ({
                $id: c.$id, name: c.name, slug: c.slug, icon: c.icon, color: c.color, description: c.description,
            }));
            return res.json({ success: true, connectors: safe });
        }

        // Tout le reste est réservé aux modérateurs.
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        const { id, category, content, active, connectorId, name, slug, icon, color, description } = body;

        switch (action) {
            // --- Notes de connaissance ---
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
                    connectorId: connectorId || '',
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
                if (connectorId !== undefined) updateData.connectorId = connectorId;
                const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, id, updateData);
                return res.json({ success: true, document: doc });
            }
            case 'delete': {
                if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
                await databases.deleteDocument(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, id);
                return res.json({ success: true });
            }

            // --- Connecteurs (gestion complète, modérateur) ---
            case 'list_connectors': {
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, [
                    Query.orderDesc('createdAt'),
                    Query.limit(50),
                ]);
                return res.json({ success: true, connectors: result.documents });
            }
            case 'create_connector': {
                if (!name || !slug) return res.json({ success: false, error: 'name et slug requis.' }, 400);
                const doc = await databases.createDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, ID.unique(), {
                    name, slug,
                    icon: icon || '🔗',
                    color: color || '#FF4757',
                    description: description || '',
                    active: active !== undefined ? active : true,
                    createdAt: new Date().toISOString(),
                });
                return res.json({ success: true, connector: doc });
            }
            case 'update_connector': {
                if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
                const updateData = {};
                if (name !== undefined) updateData.name = name;
                if (slug !== undefined) updateData.slug = slug;
                if (icon !== undefined) updateData.icon = icon;
                if (color !== undefined) updateData.color = color;
                if (description !== undefined) updateData.description = description;
                if (active !== undefined) updateData.active = active;
                const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, id, updateData);
                return res.json({ success: true, connector: doc });
            }
            case 'delete_connector': {
                if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
                await databases.deleteDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, id);
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
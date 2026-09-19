// functions/manage-vanessa-knowledge/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   Notes   : { action: 'list'|'create'|'update'|'delete', id?, category?, content?, active?, connectorId? }
//   Connecteurs (modérateur) : { action: 'list_connectors'|'create_connector'|'update_connector'|'delete_connector', id?, name?, slug?, icon?, color?, description?, sourceUrl?, partnerUserId?, active? }
//   Facturation (modérateur) : { action: 'recharge_connector_tokens', id, amount }
//   Connecteurs (public)     : { action: 'list_active_connectors' }
//   Espace partenaire (authentifié, non-modérateur) : { action: 'get_my_connector' }
//
// SÉCURITÉ : toutes les actions sont réservées aux modérateurs, SAUF
// 'list_active_connectors' (alimente les pastilles de connecteurs pour
// tous les utilisateurs) et 'get_my_connector' (permet à un partenaire de
// suivre SA propre consommation, sans jamais voir celle des autres).
import { Client, Databases, Query, ID } from 'node-appwrite';

// --- Grille tarifaire (voir Vanessa-API-Grille-Tarifaire.docx) ---
// À remettre à jour manuellement ici si la grille change un jour (taux
// USD/FCFA, tarif Anthropic, ou marge appliquée).
const SELL_PRICE_PER_MILLION_TOKENS_FCFA = 5100; // coût réel (~1700 FCFA) × marge x3

function fcfaToTokens(fcfa) {
    return Math.round((fcfa / SELL_PRICE_PER_MILLION_TOKENS_FCFA) * 1_000_000);
}

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

        // Un connecteur dont le quota est épuisé ne doit plus être
        // proposé — sauf s'il n'a jamais reçu de quota du tout
        // (tokensGranted à 0), auquel cas on le considère illimité, pour
        // ne jamais casser les connecteurs créés avant ce système de
        // facturation.
        const isExhausted = (c) => (c.tokensGranted || 0) > 0 && (c.tokensUsed || 0) >= c.tokensGranted;

        // Accessible à tout utilisateur authentifié — alimente les
        // pastilles de connecteurs dans le chat.
        if (action === 'list_active_connectors') {
            const result = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, [
                Query.equal('active', true),
                Query.orderAsc('name'),
                Query.limit(50),
            ]);
            const safe = result.documents
                .filter((c) => !isExhausted(c))
                .map((c) => ({
                    $id: c.$id, name: c.name, slug: c.slug, icon: c.icon, color: c.color, description: c.description,
                    // Ajoutés après coup — ce sont eux qui manquaient pour
                    // que le compteur mensuel de questions s'affiche aussi
                    // dans le chat, pas seulement en modération.
                    questionCount: c.questionCount || 0,
                    questionCountMonth: c.questionCountMonth || '',
                }));
            return res.json({ success: true, connectors: safe });
        }

        // Accessible à tout utilisateur authentifié — un partenaire suit
        // UNIQUEMENT le connecteur qui lui est explicitement associé
        // (partnerUserId), jamais les autres.
        if (action === 'get_my_connector') {
            const result = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, [
                Query.equal('partnerUserId', callerId),
                Query.limit(1),
            ]);
            if (result.documents.length === 0) {
                return res.json({ success: true, connector: null });
            }
            const c = result.documents[0];
            return res.json({
                success: true,
                connector: {
                    $id: c.$id, name: c.name, icon: c.icon, color: c.color,
                    active: c.active,
                    tokensGranted: c.tokensGranted || 0,
                    tokensUsed: c.tokensUsed || 0,
                },
            });
        }

        // Tout le reste est réservé aux modérateurs.
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        const { id, category, content, active, connectorId, name, slug, icon, color, description, sourceUrl, partnerUserId, amountFcfa } = body;

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
                    sourceUrl: sourceUrl || '', // laissable vide à la création, ajoutable/retirable ensuite via update_connector
                    partnerUserId: partnerUserId || '',
                    tokensGranted: 0, // 0 = illimité tant qu'aucune vente n'est enregistrée
                    tokensUsed: 0,
                    processedItemHashes: [],
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
                // sourceUrl accepte explicitement une chaîne vide : c'est
                // ce qui permet de RETIRER un lien déjà en place, pas
                // seulement d'en ajouter un.
                if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
                if (partnerUserId !== undefined) updateData.partnerUserId = partnerUserId;
                if (active !== undefined) updateData.active = active;
                const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, id, updateData);
                return res.json({ success: true, connector: doc });
            }
            case 'delete_connector': {
                if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
                await databases.deleteDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, id);
                return res.json({ success: true });
            }

            // --- Facturation ---
            case 'recharge_connector_tokens': {
                if (!id || !amountFcfa || amountFcfa <= 0) {
                    return res.json({ success: false, error: 'id et amountFcfa (positif) requis.' }, 400);
                }
                const connector = await databases.getDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, id);
                const tokensToAdd = fcfaToTokens(Number(amountFcfa));
                // Additif — le nouveau quota vient s'ajouter au restant,
                // jamais l'écraser, même paiement anticipé avant épuisement.
                const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, id, {
                    tokensGranted: (connector.tokensGranted || 0) + tokensToAdd,
                });
                return res.json({ success: true, connector: doc, tokensAdded: tokensToAdd });
            }

            default:
                return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
        }
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
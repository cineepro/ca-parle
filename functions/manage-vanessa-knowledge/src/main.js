// functions/manage-vanessa-knowledge/src/main.js — Vanessa
// Appel HTTP explicite depuis le client :
//   Notes   : { action: 'list'|'create'|'update'|'delete', id?, category?, content?, active?, connectorId? }
//   Connecteurs (modérateur) : { action: 'list_connectors'|'create_connector'|'update_connector'|'delete_connector', id?, name?, slug?, icon?, color?, description?, partnerUserId?, instructions?, model?, active? }
//   Sites d'un connecteur (modérateur) : { action: 'list_sources'|'add_source'|'update_source'|'remove_source', connectorId?, sourceId?, url?, listingSelector?, label? }
//   Facturation (modérateur) : { action: 'recharge_connector_tokens', id, amount }
//   Connecteurs (public)     : { action: 'list_active_connectors' }
//   Espace partenaire (authentifié, non-modérateur) : { action: 'get_my_connector' }
//   Lexique communautaire (authentifié, non-modérateur) : { action: 'suggest_expression', content }
//
// Un connecteur peut regrouper PLUSIEURS sites à surveiller (ex :
// "Gouvernance" = gouv.bj + assemblee-nationale.bj + presidence.bj) —
// chaque site vit comme un document séparé dans COLLECTION_CONNECTOR_SOURCES,
// avec son propre suivi (processedItemHashes, lastSyncedAt), mais toutes
// les notes qu'il produit sont rattachées au même connecteur parent. C'est
// ce qui permet une seule pastille dans le chat pour plusieurs sources.
//
// SÉCURITÉ : toutes les actions sont réservées aux modérateurs, SAUF
// 'list_active_connectors' (alimente les pastilles de connecteurs pour
// tous les utilisateurs), 'get_my_connector' (permet à un partenaire de
// suivre SA propre consommation, sans jamais voir celle des autres) et
// 'suggest_expression' (propose une entrée en attente, jamais active tant
// qu'un modérateur ne l'a pas validée).
import { Client, Databases, Query, ID } from 'node-appwrite';

// Catégories techniques reconnues par send-message et par la page
// Connaissances — ne jamais renommer sans changer aussi les constantes
// équivalentes côté send-message et VanessaKnowledgeManager.
const LEXICON_CATEGORY = 'lexique';
const URGENT_RESOURCES_CATEGORY = 'ressources_urgence';

// "Sans connecteur" : les notes créées avant l'ajout de l'attribut
// connectorId n'ont aucune valeur dessus (Appwrite ne rétro-remplit jamais
// les documents existants), les plus récentes ont une chaîne vide — une
// requête stricte sur '' exclurait silencieusement les premières.
// Instructions propres à un connecteur (texte libre rédigé par l'équipe) et
// modèle de réponse choisi pour lui. Plafonnés / validés ici (et pas seulement
// dans le formulaire) : cette Function est la seule porte d'écriture.
const MAX_INSTRUCTIONS_CHARS = 4000;
const CONNECTOR_MODELS = ['', 'haiku', 'sonnet']; // '' = modèle par défaut de send-message
const cleanInstructions = (v) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, MAX_INSTRUCTIONS_CHARS);
const cleanModel = (v) => (CONNECTOR_MODELS.includes(v) ? v : '');

const noConnectorFilter = () => Query.or([Query.equal('connectorId', ''), Query.isNull('connectorId')]);

const generalScopeFilters = (withOr = true) => [
    Query.notEqual('category', LEXICON_CATEGORY),
    Query.notEqual('category', URGENT_RESOURCES_CATEGORY),
    withOr ? noConnectorFilter() : Query.equal('connectorId', ''),
];

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
    const COLLECTION_CONNECTOR_SOURCES = process.env.COLLECTION_CONNECTOR_SOURCES;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action } = body;

        // Un connecteur dont le quota est épuisé ne doit plus être
        // proposé — sauf s'il n'a jamais reçu de quota du tout
        // (tokensGranted à 0), auquel cas on le considère illimité, pour
        // ne jamais casser les connecteurs créés avant ce système de
        // facturation.
        const isExhausted = (c) => (c.tokensGranted || 0) > 0 && (c.tokensUsed || 0) >= c.tokensGranted;

        // Accessible à tout utilisateur authentifié — propose une nouvelle
        // expression au lexique. Créée DÉSACTIVÉE et non attribuée à un
        // partenaire, exactement comme une fiche Ça sert en attente : elle
        // n'est utilisable par Vanessa qu'après validation d'un modérateur
        // depuis /moderation (le bouton "Activer" déjà existant).
        if (action === 'suggest_expression') {
            const { content } = body;
            if (!content || content.trim().length < 5) {
                return res.json({ success: false, error: 'Décris un peu plus ton expression.' }, 400);
            }
            const doc = await databases.createDocument(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, ID.unique(), {
                category: 'lexique',
                content: content.trim().slice(0, 300),
                connectorId: '',
                submittedBy: callerId,
                active: false, // ⚠️ jamais utilisable avant validation — même principe que Ça sert
                createdAt: new Date().toISOString(),
            });
            return res.json({ success: true, document: doc });
        }

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

        const { id, category, content, active, connectorId, name, slug, icon, color, description, partnerUserId, instructions, model, amountFcfa, sourceId, url, listingSelector, label } = body;

        switch (action) {
            // --- Notes de connaissance ---
            case 'list': {
                // Liste FILTRÉE ET PAGINÉE — jamais toute la collection d'un
                // coup. Avant, chaque ouverture de la page relisait jusqu'à
                // 500 notes de tous les types mélangés (coût de lecture
                // Appwrite proportionnel au volume, et défilement
                // interminable). Désormais : un type à la fois (scope), un
                // statut à la fois (active), 25 notes par page.
                //   scope : 'lexique' | 'urgence' | 'general' | 'connector'
                const { scope, search, cursor } = body;
                const limit = Math.min(50, Math.max(1, parseInt(body.limit, 10) || 25));

                // Sans scope (ancien appel) : on renvoie seulement les plus
                // récentes, jamais tout.
                if (!scope) {
                    const recent = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                        Query.orderDesc('createdAt'), Query.limit(25),
                    ]);
                    return res.json({ success: true, documents: recent.documents, total: recent.total, otherTotal: 0, nextCursor: null });
                }

                const scopeFilters = (withOr) => {
                    switch (scope) {
                        case 'lexique': return [Query.equal('category', LEXICON_CATEGORY)];
                        case 'urgence': return [Query.equal('category', URGENT_RESOURCES_CATEGORY)];
                        case 'general': return generalScopeFilters(withOr);
                        case 'connector': return connectorId ? [Query.equal('connectorId', connectorId)] : null;
                        default: return null;
                    }
                };
                if (!scopeFilters(true)) {
                    return res.json({ success: false, error: scope === 'connector' ? 'connectorId requis.' : `Type inconnu : ${scope}` }, 400);
                }

                const extra = [];
                if (search) extra.push(Query.search('content', String(search).slice(0, 100)));
                const statusFilter = active === undefined ? [] : [Query.equal('active', !!active)];
                const page = [Query.orderDesc('createdAt'), Query.limit(limit)];
                if (cursor) page.push(Query.cursorAfter(cursor));

                // "Sans connecteur" via Query.or ; si le serveur le refuse,
                // repli sur la requête stricte (chaîne vide) plutôt que
                // d'échouer entièrement.
                const run = async (statusQueries, pageQueries) => {
                    try {
                        return await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                            ...scopeFilters(true), ...extra, ...statusQueries, ...pageQueries,
                        ]);
                    } catch (e) {
                        if (scope !== 'general' || search) throw e;
                        return await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                            ...scopeFilters(false), ...extra, ...statusQueries, ...pageQueries,
                        ]);
                    }
                };

                try {
                    const result = await run(statusFilter, page);
                    // Total de l'AUTRE statut (pour afficher "À activer (n) /
                    // Activées (m)") : une requête d'une seule ligne,
                    // seulement à la première page.
                    let otherTotal = 0;
                    if (active !== undefined && !cursor) {
                        otherTotal = (await run([Query.equal('active', !active)], [Query.limit(1)])).total;
                    }
                    const docs = result.documents;
                    return res.json({
                        success: true,
                        documents: docs,
                        total: result.total,
                        otherTotal,
                        nextCursor: docs.length === limit ? docs[docs.length - 1].$id : null,
                    });
                } catch (e) {
                    if (search && /fulltext|index/i.test(e.message || '')) {
                        return res.json({ success: false, error: "La recherche par texte demande un index « fulltext » sur l'attribut content de la collection vanessa_knowledge (Appwrite → Databases → Indexes)." });
                    }
                    throw e;
                }
            }
            case 'pending_counts': {
                // Combien de notes attendent d'être activées, par type et par
                // connecteur — une requête d'UNE ligne par compteur (le total
                // est renvoyé sans lire les notes), donc quelques lectures au
                // lieu de centaines. Renvoie aussi la liste des connecteurs,
                // ce qui évite un second appel à l'ouverture de la page.
                const countPending = async (filtersWithOr, filtersFallback) => {
                    try {
                        return (await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                            Query.equal('active', false), ...filtersWithOr, Query.limit(1),
                        ])).total;
                    } catch (e) {
                        if (!filtersFallback) throw e;
                        return (await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                            Query.equal('active', false), ...filtersFallback, Query.limit(1),
                        ])).total;
                    }
                };
                const connectorsRes = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, [
                    Query.orderDesc('createdAt'), Query.limit(100),
                ]);
                const [lexique, urgence, general, ...perConnector] = await Promise.all([
                    countPending([Query.equal('category', LEXICON_CATEGORY)]),
                    countPending([Query.equal('category', URGENT_RESOURCES_CATEGORY)]),
                    countPending(generalScopeFilters(true), generalScopeFilters(false)),
                    ...connectorsRes.documents.map((c) => countPending([Query.equal('connectorId', c.$id)])),
                ]);
                return res.json({
                    success: true,
                    lexique, urgence, general,
                    connectors: connectorsRes.documents.map((c, i) => ({
                        $id: c.$id, name: c.name, icon: c.icon, color: c.color, active: c.active, pending: perConnector[i],
                    })),
                });
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
                    partnerUserId: partnerUserId || '',
                    instructions: cleanInstructions(instructions),
                    model: cleanModel(model),
                    tokensGranted: 0, // 0 = illimité tant qu'aucune vente n'est enregistrée
                    tokensUsed: 0,
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
                if (partnerUserId !== undefined) updateData.partnerUserId = partnerUserId;
                if (instructions !== undefined) updateData.instructions = cleanInstructions(instructions);
                if (model !== undefined) updateData.model = cleanModel(model);
                if (active !== undefined) updateData.active = active;
                const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, id, updateData);
                return res.json({ success: true, connector: doc });
            }
            case 'delete_connector': {
                if (!id) return res.json({ success: false, error: 'id requis.' }, 400);
                await databases.deleteDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, id);
                // Les sites qui lui étaient rattachés n'ont plus aucun
                // intérêt sans leur connecteur parent — nettoyage pour ne
                // pas laisser de sites orphelins que sync-connector-sources
                // continuerait à vérifier pour rien.
                try {
                    const orphaned = await databases.listDocuments(DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, [
                        Query.equal('connectorId', id), Query.limit(100),
                    ]);
                    await Promise.all(orphaned.documents.map((s) => databases.deleteDocument(DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, s.$id)));
                } catch { /* non bloquant : le connecteur est supprimé de toute façon */ }
                return res.json({ success: true });
            }

            // --- Sites surveillés par un connecteur (un connecteur peut en
            // avoir plusieurs — voir l'en-tête du fichier) ---
            case 'list_sources': {
                if (!connectorId) return res.json({ success: false, error: 'connectorId requis.' }, 400);
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, [
                    Query.equal('connectorId', connectorId), Query.orderDesc('createdAt'), Query.limit(50),
                ]);
                return res.json({ success: true, sources: result.documents });
            }
            case 'add_source': {
                if (!connectorId || !url) return res.json({ success: false, error: 'connectorId et url requis.' }, 400);
                const doc = await databases.createDocument(DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, ID.unique(), {
                    connectorId,
                    url,
                    label: label || '',
                    listingSelector: listingSelector || '',
                    processedItemHashes: [],
                    lastSyncedAt: '',
                    createdAt: new Date().toISOString(),
                });
                return res.json({ success: true, source: doc });
            }
            case 'update_source': {
                if (!sourceId) return res.json({ success: false, error: 'sourceId requis.' }, 400);
                const updateData = {};
                if (url !== undefined) updateData.url = url;
                if (label !== undefined) updateData.label = label;
                if (listingSelector !== undefined) updateData.listingSelector = listingSelector;
                const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, sourceId, updateData);
                return res.json({ success: true, source: doc });
            }
            case 'remove_source': {
                if (!sourceId) return res.json({ success: false, error: 'sourceId requis.' }, 400);
                await databases.deleteDocument(DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, sourceId);
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
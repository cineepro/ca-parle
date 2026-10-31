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
//     { action: 'save_place', id?, name, kind, latitude, longitude, description, active }   (lieu du campus)
//     { action: 'save_places', places: [...] } / { action: 'delete_place', id }
//     { action: 'import_osm_places', latitude, longitude, radius }   (propose des lieux depuis OpenStreetMap)
// La lecture du menu et des actualités visibles se fait directement depuis l'app (permission de lecture « utilisateurs »).
import { Client, Databases, ID, Query } from 'node-appwrite';
import { MAX_NEWS_PER_DAY, validateNews, validateRestaurant, validatePlace, buildOverpassQuery, mapOsmElement, dedupeCandidates, MAX_OSM_RESULTS } from './lib.js';

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
    const PLACES = process.env.COLLECTION_UAC_PLACES;

    try {
        const caller = await databases.getDocument(DB, USERS, callerId);
        if (caller.isBanned) return res.json({ success: false, error: 'Ton compte ne peut pas publier.' });
        const isMod = !!caller.isModerator;
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action, id } = body;
        const needMod = () => (isMod ? null : res.json({ success: false, error: 'Action réservée aux modérateurs.' }));

        switch (action) {
            case 'publish_news': {
                const checked = validateNews(body);
                if (checked.error) return res.json({ success: false, error: checked.error });
                const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
                const recent = await databases.listDocuments(DB, NEWS, [
                    Query.equal('authorId', callerId), Query.greaterThan('createdAt', since), Query.limit(MAX_NEWS_PER_DAY),
                ]);
                if (recent.total >= MAX_NEWS_PER_DAY) {
                    return res.json({ success: false, error: `Tu as déjà publié ${MAX_NEWS_PER_DAY} actualités aujourd’hui. Reviens demain.` });
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
                if (!id) return res.json({ success: false, error: 'id requis.' });
                const doc = await databases.getDocument(DB, NEWS, id);
                if (doc.authorId !== callerId && !isMod) return res.json({ success: false, error: 'Tu ne peux supprimer que tes propres actualités.' });
                await databases.deleteDocument(DB, NEWS, id);
                return res.json({ success: true });
            }

            case 'hide_news':
            case 'show_news': {
                const denied = needMod(); if (denied) return denied;
                if (!id) return res.json({ success: false, error: 'id requis.' });
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
                if (checked.error) return res.json({ success: false, error: checked.error });
                const doc = id
                    ? await databases.updateDocument(DB, RESTOS, id, { ...checked.value, updatedAt: new Date().toISOString() })
                    : await databases.createDocument(DB, RESTOS, ID.unique(), { ...checked.value, updatedAt: new Date().toISOString() });
                return res.json({ success: true, document: doc });
            }

            case 'save_place': {
                const denied = needMod(); if (denied) return denied;
                const checked = validatePlace(body);
                if (checked.error) return res.json({ success: false, error: checked.error });
                const doc = id ? await databases.updateDocument(DB, PLACES, id, checked.value) : await databases.createDocument(DB, PLACES, ID.unique(), checked.value);
                return res.json({ success: true, document: doc });
            }

            case 'save_places': {
                // Enregistre d'un coup les candidats OpenStreetMap cochés par le modérateur.
                const denied = needMod(); if (denied) return denied;
                const list = Array.isArray(body.places) ? body.places.slice(0, MAX_OSM_RESULTS) : [];
                let saved = 0;
                for (const p of list) {
                    const checked = validatePlace(p);
                    if (checked.error) continue;
                    await databases.createDocument(DB, PLACES, ID.unique(), checked.value);
                    saved += 1;
                }
                return res.json({ success: true, saved });
            }

            case 'delete_place': {
                const denied = needMod(); if (denied) return denied;
                if (!id) return res.json({ success: false, error: 'id requis.' });
                await databases.deleteDocument(DB, PLACES, id);
                return res.json({ success: true });
            }

            case 'import_osm_places': {
                // Propose des lieux du campus depuis OpenStreetMap — rien n'est enregistré ici.
                const denied = needMod(); if (denied) return denied;
                const lat = Number(body.latitude), lng = Number(body.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.json({ success: false, error: 'Centre du campus invalide.' });
                const query = buildOverpassQuery(lat, lng, body.radius);
                let data = null;
                for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
                    try {
                        const r = await fetch(host, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'VanessaUAC/1.0 (import moderateur)', Accept: 'application/json' },
                            body: `data=${encodeURIComponent(query)}`,
                        });
                        if (r.ok) { data = await r.json(); break; }
                        error(`Overpass ${host} : statut ${r.status}`);
                    } catch (e) { error(`Overpass ${host} : ${e.message}`); }
                }
                if (!data) return res.json({ success: false, error: 'OpenStreetMap ne répond pas pour le moment. Réessaie dans quelques minutes.' });
                const existing = (await databases.listDocuments(DB, PLACES, [Query.limit(500)])).documents;
                const mapped = (data.elements || []).map(mapOsmElement).filter(Boolean);
                return res.json({ success: true, candidates: dedupeCandidates(mapped, existing), found: mapped.length });
            }

            case 'delete_restaurant': {
                const denied = needMod(); if (denied) return denied;
                if (!id) return res.json({ success: false, error: 'id requis.' });
                await databases.deleteDocument(DB, RESTOS, id);
                return res.json({ success: true });
            }

            default:
                return res.json({ success: false, error: 'Action inconnue.' });
        }
    } catch (err) {
        error(`manage-uac: ${err.message}`);
        return res.json({ success: false, error: 'Une erreur est survenue.' }, 500);
    }
};

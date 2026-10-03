// functions/import-osm-spots/src/main.js — Vanessa
// Réservé aux modérateurs.
//   { action: 'search', lat, lng, radiusMeters, category }  -> interroge OpenStreetMap, met les résultats en attente
//   { action: 'list', status? }                              -> liste les candidats
//   { action: 'accept', candidateId, overrides? }             -> crée une vraie fiche Ça sert, déjà vérifiée
//   { action: 'ignore', candidateId }                         -> écarte le candidat, ne le propose plus
//
// PRINCIPE : rien n'entre JAMAIS dans local_spots sans un clic explicite
// "Accepter" d'un modérateur — cette Function ne fait que proposer des
// candidats à relire, jamais elle ne publie seule.
//
// Utilise Overpass (l'API publique d'OpenStreetMap), gratuite et sans clé —
// mais partagée par toute la communauté : recherches volontairement bornées
// (rayon max 3 km, résultats limités) pour rester raisonnable vis-à-vis du
// serveur, comme le recommande la documentation d'Overpass.
//
// Attribution : les fiches importées d'OpenStreetMap doivent porter la
// mention de leur origine (ODbL) — c'est fait automatiquement dans la
// description créée à l'étape "accept".
import { Client, Databases, ID, Query, Permission, Role } from 'node-appwrite';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MAX_RADIUS_M = 3000;
const MAX_RESULTS = 60;

// Correspondance entre nos catégories et les vrais tags OpenStreetMap.
// Volontairement un premier jeu raisonnable, pas exhaustif — à élargir
// avec l'usage si une catégorie ramène trop peu de résultats.
const CATEGORY_TAGS = {
    manger: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food', 'amenity=bar'],
    services: ['amenity=fuel', 'shop=car_repair', 'shop=hairdresser', 'craft', 'amenity=bank', 'shop=laundry'],
    shopping: ['shop=supermarket', 'shop=convenience', 'shop=clothes', 'shop=general', 'amenity=marketplace'],
    sante: ['amenity=pharmacy', 'amenity=hospital', 'amenity=clinic', 'amenity=doctors'],
    autre: ['tourism=hotel', 'tourism=attraction', 'amenity=place_of_worship'],
};

function buildOverpassQuery(lat, lng, radius, category) {
    const tags = CATEGORY_TAGS[category] || CATEGORY_TAGS.autre;
    const clauses = tags.map((tag) => {
        const filter = tag.includes('=') ? `["${tag.split('=')[0]}"="${tag.split('=')[1]}"]` : `["${tag}"]`;
        return `  node${filter}(around:${radius},${lat},${lng});\n  way${filter}(around:${radius},${lat},${lng});`;
    }).join('\n');
    return `[out:json][timeout:25];\n(\n${clauses}\n);\nout center tags ${MAX_RESULTS};`;
}
function mapOsmElement(el, category) {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!lat || !lng || !tags.name) return null; // sans nom ni coordonnées, inexploitable
    const addressBits = [tags['addr:street'], tags['addr:city'] || tags['addr:suburb']].filter(Boolean);
    return {
        sourceRef: `${el.type}/${el.id}`,
        name: tags.name,
        category,
        description: tags.cuisine ? `Cuisine : ${tags.cuisine}` : '',
        quartier: tags['addr:suburb'] || tags['addr:city'] || '',
        phone: tags.phone || tags['contact:phone'] || '',
        latitude: lat,
        longitude: lng,
        addressHint: addressBits.join(', '),
    };
}

export default async ({ req, res, log, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) return res.json({ success: false, error: 'Authentification requise.' }, 401);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const COLLECTION_LOCAL_SPOTS = process.env.COLLECTION_LOCAL_SPOTS;
    const COLLECTION_IMPORT_CANDIDATES = process.env.COLLECTION_IMPORT_CANDIDATES;

    try {
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        log(`Action reçue : ${body.action}`);

        if (body.action === 'search') {
            const { lat, lng, category } = body;
            const radius = Math.min(MAX_RADIUS_M, Math.max(200, body.radiusMeters || 1000));
            if (!lat || !lng || !category) return res.json({ success: false, error: 'lat, lng et category requis.' }, 400);

            const query = buildOverpassQuery(lat, lng, radius, category);
            log(`Requête Overpass (${category}, rayon ${radius} m, centre ${lat},${lng}) :\n${query}`);

            // IMPORTANT : Overpass attend un corps de formulaire classique
            // ("data=..."). Sans l'en-tête Content-Type explicite, certains
            // runtimes n'envoient rien de précis, et Overpass peut alors mal
            // interpréter — voire rejeter — la requête. C'était la cause la
            // plus probable de l'échec silencieux rencontré.
            // Overpass exige désormais que chaque appelant s'identifie
            // clairement via un en-tête User-Agent — sans lui, son serveur
            // (Apache) répond 406 Not Acceptable, exactement l'erreur
            // rencontrée. Confirmé par la documentation d'usage d'Overpass.
            //
            // Le serveur public d'Overpass est partagé par toute la
            // communauté, sans garantie de disponibilité — un 502/503/504
            // (serveur surchargé, passager) ne veut rien dire de cassé chez
            // nous. On retente une fois, sur un second serveur miroir
            // public, avant d'abandonner.
            const overpassHosts = [OVERPASS_URL, 'https://overpass.kumi.systems/api/interpreter'];
            let response = null;
            let lastErrorBody = '';
            for (const host of overpassHosts) {
                try {
                    const attempt = await fetch(host, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'User-Agent': 'VanessaCaSert/1.0 (kinemaplus.com; import moderateur)',
                            'Accept': 'application/json',
                        },
                        body: `data=${encodeURIComponent(query)}`,
                    });
                    log(`Overpass (${host}) a répondu : statut ${attempt.status}`);
                    if (attempt.ok) {
                        response = attempt;
                        break;
                    }
                    lastErrorBody = await attempt.text().catch(() => '');
                    error(`Overpass (${host}) a échoué (${attempt.status}) : ${lastErrorBody.slice(0, 300)}`);
                } catch (fetchErr) {
                    error(`Échec réseau vers Overpass (${host}) : ${fetchErr.message}`);
                }
            }

            if (!response) {
                // Les deux serveurs ont échoué — le code de retour reste
                // volontairement 200 : Appwrite marque "failed" (et masque
                // notre message) toute exécution qui renvoie un code HTTP
                // différent de 200-299 — exactement ce qui a caché l'erreur
                // la toute première fois.
                return res.json({ success: false, error: "OpenStreetMap (et son miroir de secours) sont injoignables pour l'instant — réessaie dans quelques minutes, c'est un serveur public partagé, pas un souci de notre côté." });
            }

            const data = await response.json();
            log(`Overpass a renvoyé ${data.elements?.length || 0} élément(s) brut(s).`);
            const mapped = (data.elements || []).map((el) => mapOsmElement(el, category)).filter(Boolean);
            log(`${mapped.length} élément(s) exploitable(s) après filtrage (nom + coordonnées présents).`);

            // On ignore ce qui a déjà été proposé (même point OSM) pour ne
            // jamais faire relire deux fois le même candidat.
            const existingRefs = new Set();
            const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_IMPORT_CANDIDATES, [
                Query.equal('source', 'openstreetmap'), Query.limit(500),
            ]);
            existing.documents.forEach((d) => existingRefs.add(d.sourceRef));

            let created = 0;
            for (const c of mapped) {
                if (existingRefs.has(c.sourceRef)) continue;
                await databases.createDocument(DATABASE_ID, COLLECTION_IMPORT_CANDIDATES, ID.unique(), {
                    source: 'openstreetmap', status: 'en_attente', createdAt: new Date().toISOString(), ...c,
                });
                existingRefs.add(c.sourceRef);
                created++;
            }
            log(`${created} nouveau(x) candidat(s) enregistré(s) (${mapped.length - created} déjà connu(s)).`);
            return res.json({ success: true, found: mapped.length, created });
        }

        if (body.action === 'list') {
            const status = body.status || 'en_attente';
            const r = await databases.listDocuments(DATABASE_ID, COLLECTION_IMPORT_CANDIDATES, [
                Query.equal('status', status), Query.orderDesc('createdAt'), Query.limit(100),
            ]);
            log(`Liste "${status}" : ${r.documents.length} candidat(s).`);
            return res.json({ success: true, candidates: r.documents });
        }

        if (body.action === 'accept') {
            const { candidateId, overrides } = body;
            if (!candidateId) return res.json({ success: false, error: 'candidateId requis.' }, 400);
            const c = await databases.getDocument(DATABASE_ID, COLLECTION_IMPORT_CANDIDATES, candidateId);
            const final = { ...c, ...(overrides || {}) };
            log(`Acceptation du candidat ${candidateId} ("${final.name}").`);

            const baseDescription = final.description || '';
            const attribution = 'Source : OpenStreetMap, contributeurs (licence ODbL).';

            const spot = await databases.createDocument(DATABASE_ID, COLLECTION_LOCAL_SPOTS, ID.unique(), {
                name: final.name,
                category: final.category,
                description: [baseDescription, attribution].filter(Boolean).join(' — '),
                quartier: final.quartier || '',
                country: final.country || 'Bénin',
                phone: final.phone || '',
                authorId: callerId,
                authorName: callerUser.name || 'Équipe Vanessa',
                confirmCount: 0,
                isVerified: true, // un modérateur vient de le relire et valider explicitement
                moderationStatus: 'visible',
                latitude: final.latitude,
                longitude: final.longitude,
                createdAt: new Date().toISOString(),
            }, [Permission.read(Role.any()), Permission.update(Role.user(callerId))]);
            // La collection local_spots a la sécurité par ligne (RLS)
            // activée : sans ces permissions explicites, un document reste
            // invisible pour tout le monde en dehors de la console Appwrite
            // (qui, elle, contourne les permissions) — même avec
            // moderationStatus déjà à "visible". C'était la vraie cause des
            // fiches "présentes en base mais invisibles sur le site".

            await databases.updateDocument(DATABASE_ID, COLLECTION_IMPORT_CANDIDATES, candidateId, { status: 'accepte' });
            log(`Fiche Ça sert créée : ${spot.$id}.`);
            return res.json({ success: true, spot });
        }

        if (body.action === 'ignore') {
            if (!body.candidateId) return res.json({ success: false, error: 'candidateId requis.' }, 400);
            await databases.updateDocument(DATABASE_ID, COLLECTION_IMPORT_CANDIDATES, body.candidateId, { status: 'ignore' });
            log(`Candidat ${body.candidateId} ignoré.`);
            return res.json({ success: true });
        }

        return res.json({ success: false, error: `Action inconnue : ${body.action}` }, 400);
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
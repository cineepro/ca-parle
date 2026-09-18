// functions/get-route/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   functions.createExecution('get-route', JSON.stringify({ fromLat, fromLng, toLat, toLng }))
//
// Sert d'intermédiaire vers OpenRouteService (gratuit, basé sur
// OpenStreetMap) — la clé API reste ici, côté serveur, jamais exposée au
// navigateur. Réservé aux utilisateurs authentifiés pour éviter qu'un
// script extérieur épuise notre quota gratuit quotidien.
export default async ({ req, res, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) {
        return res.json({ success: false, error: 'Authentification requise.' }, 401);
    }

    const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { fromLat, fromLng, toLat, toLng } = body;

        if ([fromLat, fromLng, toLat, toLng].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
            return res.json({ success: false, error: 'Coordonnées manquantes ou invalides.' }, 400);
        }

        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${fromLng},${fromLat}&end=${toLng},${toLat}`;
        const response = await fetch(url);

        if (!response.ok) {
            const errorBody = await response.text();
            error(`OpenRouteService a répondu ${response.status} : ${errorBody}`);
            return res.json({ success: false, error: "Impossible de calculer l'itinéraire pour l'instant." }, 502);
        }

        const data = await response.json();
        const feature = data.features?.[0];
        if (!feature) {
            return res.json({ success: false, error: 'Aucun itinéraire routier trouvé entre ces deux points.' }, 404);
        }

        return res.json({
            success: true,
            geometry: feature.geometry, // GeoJSON LineString — à dessiner tel quel sur la carte
            distanceKm: (feature.properties.summary.distance / 1000).toFixed(1),
            durationMin: Math.round(feature.properties.summary.duration / 60),
        });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
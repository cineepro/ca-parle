// functions/manage-uac/src/lib.js — Vanessa
// Règles de validation de l'espace UAC, sans accès à la base (donc testables).

export const NEWS_KINDS = ['concours', 'location', 'emploi', 'soutenance', 'excursion', 'autre'];
export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const MEALS = ['matin', 'midi', 'soir'];
export const MAX_NEWS_PER_DAY = 5;

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanMultiline = (v, max) => String(v ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

export function validateNews(input) {
    const kind = String(input?.kind || '');
    if (!NEWS_KINDS.includes(kind)) return { error: 'Choisis un type d’actualité.' };
    const title = clean(input.title, 120);
    const content = cleanMultiline(input.content, 2000);
    if (title.length < 4) return { error: 'Le titre est trop court.' };
    if (content.length < 10) return { error: 'Explique un peu plus (10 caractères minimum).' };
    const eventDate = clean(input.eventDate, 10);
    if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return { error: 'Date invalide.' };
    const imageId = clean(input.imageId, 36);
    if (imageId && !/^[a-zA-Z0-9_.-]{1,36}$/.test(imageId)) return { error: 'Image invalide.' };
    return { value: { kind, title, content, contact: clean(input.contact, 120), eventDate, imageId } };
}

// Menu de la semaine : { lundi: { matin, midi, soir }, ... } — un plat par repas, répété chaque semaine.
export function validateSchedule(input) {
    const out = {};
    for (const day of DAYS) {
        out[day] = {};
        for (const meal of MEALS) out[day][meal] = clean(input?.[day]?.[meal], 120);
    }
    return out;
}

export function validateRestaurant(input) {
    const name = clean(input?.name, 80);
    if (name.length < 2) return { error: 'Le nom du restaurant est obligatoire.' };
    const order = Number.isFinite(Number(input?.order)) ? Math.max(0, Math.min(99, Math.trunc(Number(input.order)))) : 0;
    return {
        value: {
            name,
            place: clean(input?.place, 120),
            order,
            active: input?.active !== false,
            schedule: JSON.stringify(validateSchedule(input?.schedule)),
        },
    };
}

// ───────────── Lieux du campus (carte) ─────────────
export const PLACE_KINDS = ['amphi', 'administration', 'banque', 'commerce', 'restauration', 'sante', 'bibliotheque', 'sport', 'transport', 'autre'];

export function validatePlace(input) {
    const name = clean(input?.name, 100);
    if (name.length < 2) return { error: 'Le nom du lieu est obligatoire.' };
    const kind = String(input?.kind || '');
    if (!PLACE_KINDS.includes(kind)) return { error: 'Choisis un type de lieu.' };
    const latitude = Number(input?.latitude);
    const longitude = Number(input?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        return { error: 'Position invalide : place le lieu sur la carte.' };
    }
    return { value: { name, kind, latitude, longitude, description: cleanMultiline(input?.description, 500), active: input?.active !== false } };
}

// Correspondance entre nos types et les étiquettes OpenStreetMap (premier jeu raisonnable, à élargir avec l'usage).
// L'ordre compte : un lieu prend le PREMIER type qui correspond.
export const OSM_RULES = [
    { kind: 'banque', match: (t) => t.amenity === 'bank' || t.amenity === 'atm' },
    { kind: 'bibliotheque', match: (t) => t.amenity === 'library' },
    { kind: 'sante', match: (t) => ['pharmacy', 'clinic', 'hospital', 'doctors'].includes(t.amenity) },
    { kind: 'restauration', match: (t) => ['restaurant', 'cafe', 'fast_food', 'canteen', 'bar'].includes(t.amenity) },
    { kind: 'sport', match: (t) => ['pitch', 'sports_centre', 'stadium'].includes(t.leisure) },
    { kind: 'administration', match: (t) => ['government', 'administrative'].includes(t.office) || ['townhall', 'post_office', 'police'].includes(t.amenity) },
    { kind: 'transport', match: (t) => t.amenity === 'bus_station' || t.public_transport === 'station' },
    { kind: 'commerce', match: (t) => !!t.shop || t.amenity === 'marketplace' },
    { kind: 'amphi', match: (t) => ['university', 'college', 'school', 'lecture_hall'].includes(t.amenity) || t.building === 'university' },
    { kind: 'autre', match: (t) => t.amenity === 'place_of_worship' },
];

export const OSM_FILTERS = [
    '["amenity"~"^(bank|atm|library|pharmacy|clinic|hospital|doctors|restaurant|cafe|fast_food|canteen|bar|townhall|post_office|police|bus_station|marketplace|university|college|school|lecture_hall|place_of_worship)$"]',
    '["leisure"~"^(pitch|sports_centre|stadium)$"]',
    '["office"~"^(government|administrative)$"]',
    '["building"="university"]',
    '["shop"]',
];

export const MAX_OSM_RADIUS_M = 4000;
export const MAX_OSM_RESULTS = 200;

export function buildOverpassQuery(lat, lng, radius) {
    const r = Math.min(MAX_OSM_RADIUS_M, Math.max(200, Math.trunc(Number(radius) || 2500)));
    const clauses = OSM_FILTERS.map((f) => `  node${f}(around:${r},${lat},${lng});\n  way${f}(around:${r},${lat},${lng});`).join('\n');
    return `[out:json][timeout:30];\n(\n${clauses}\n);\nout center tags ${MAX_OSM_RESULTS};`;
}

// Un élément OSM → un lieu candidat (ou null : sans nom, sans position ou d'un type qu'on ne garde pas).
export function mapOsmElement(el) {
    const tags = el?.tags || {};
    const name = clean(tags.name || tags['name:fr'], 100);
    const latitude = el?.lat ?? el?.center?.lat;
    const longitude = el?.lon ?? el?.center?.lon;
    if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    const rule = OSM_RULES.find((r) => r.match(tags));
    if (!rule) return null;
    return { osmId: `${el.type}/${el.id}`, name, kind: rule.kind, latitude, longitude, description: clean(tags.description || tags.operator || '', 200) };
}

const metersBetween = (a, b) => {
    const R = 6371000, rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.latitude - a.latitude), dLng = rad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
};

// Écarte les candidats déjà présents (même nom, ou à moins de 25 m d'un lieu de même nom) et les doublons entre eux.
export function dedupeCandidates(candidates, existing) {
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
    const kept = [];
    for (const c of candidates) {
        const same = [...existing, ...kept].some((p) => norm(p.name) === norm(c.name) && metersBetween(p, c) < 200);
        if (!same) kept.push(c);
    }
    return kept;
}

// ───────────── Liens Google Maps → coordonnées ─────────────
const COORD = '(-?\\d{1,3}\\.\\d{3,})';
const inRange = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// Cherche des coordonnées dans une adresse ou un texte. Ordre : épingle exacte (!3d…!4d…), puis centre de la vue (@lat,lng),
// puis paramètres (q=, ll=, destination=, center=).
export function extractCoords(text) {
    const s = decodeURIComponent(String(text || '').replace(/%(?![0-9a-fA-F]{2})/g, '%25'));
    const patterns = [
        new RegExp(`!3d${COORD}!4d${COORD}`),
        new RegExp(`@${COORD},${COORD}`),
        new RegExp(`[?&](?:q|ll|destination|center|query)=${COORD}[,+ ]\\s*${COORD}`),
    ];
    for (const re of patterns) {
        const m = s.match(re);
        if (m && inRange(Number(m[1]), Number(m[2]))) return { latitude: Number(m[1]), longitude: Number(m[2]) };
    }
    return null;
}

// Seuls les domaines Google Maps sont suivis : la fonction ne doit pas pouvoir servir à visiter n'importe quel site.
export function isAllowedMapsUrl(raw) {
    let u;
    try { u = new URL(raw); } catch { return false; }
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 'goo.gl' || h === 'maps.app.goo.gl') return true;
    if (h === 'consent.google.com') return true;
    if (/^(www\.)?google\.[a-z.]{2,6}$/.test(h)) return u.pathname.startsWith('/maps');
    return h === 'maps.google.com';
}

// Suit les redirections à la main (5 maximum), en restant sur les domaines autorisés.
export async function resolveMapLink(url, fetchImpl = fetch) {
    let current = String(url || '').trim();
    const direct = extractCoords(current);
    if (direct && isAllowedMapsUrl(current)) return direct;
    for (let hop = 0; hop < 6; hop += 1) {
        if (!isAllowedMapsUrl(current)) return { error: 'Lien non reconnu (attendu : un lien Google Maps).' };
        let res;
        try {
            res = await fetchImpl(current, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VanessaUAC/1.0)', 'Accept-Language': 'fr' }, signal: AbortSignal.timeout(6000) });
        } catch { return { error: 'Le lien ne répond pas.' }; }
        const loc = res.headers?.get?.('location');
        if (res.status >= 300 && res.status < 400 && loc) {
            const next = new URL(loc, current).toString();
            let target = next;
            // Page de consentement : la vraie adresse est dans le paramètre « continue ».
            const u = new URL(next);
            if (u.hostname === 'consent.google.com' && u.searchParams.get('continue')) target = u.searchParams.get('continue');
            const found = extractCoords(target);
            if (found) return found;
            current = target;
            continue;
        }
        // Pas de redirection : dernier recours, chercher dans le contenu de la page.
        const body = (await res.text().catch(() => '')).slice(0, 400000);
        return extractCoords(body) || { error: 'Coordonnées introuvables dans ce lien.' };
    }
    return { error: 'Trop de redirections.' };
}

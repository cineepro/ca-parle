import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNews, validateRestaurant, validateSchedule } from '../src/lib.js';

test('une actualité valide est nettoyée', () => {
    const r = validateNews({ kind: 'location', title: '  Chambre   à louer ', content: 'Chambre au quartier Tankpè, 15 000 F par mois.', contact: '97000000', eventDate: '2026-11-05' });
    assert.equal(r.value.title, 'Chambre à louer');
    assert.equal(r.value.eventDate, '2026-11-05');
});

test('type inconnu, titre ou texte trop courts, date ou image invalides sont refusés', () => {
    assert.ok(validateNews({ kind: 'pub', title: 'Titre ok', content: 'Contenu assez long' }).error);
    assert.ok(validateNews({ kind: 'emploi', title: 'ab', content: 'Contenu assez long' }).error);
    assert.ok(validateNews({ kind: 'emploi', title: 'Titre ok', content: 'court' }).error);
    assert.ok(validateNews({ kind: 'emploi', title: 'Titre ok', content: 'Contenu assez long', eventDate: '5/11/2026' }).error);
    assert.ok(validateNews({ kind: 'emploi', title: 'Titre ok', content: 'Contenu assez long', imageId: '../etc' }).error);
});

test('le menu garde les 7 jours × 3 repas, ignore le reste et borne les textes', () => {
    const s = validateSchedule({ jeudi: { soir: 'Riz'.padEnd(300, 'x'), nimporte: 'a' }, truc: {} });
    assert.equal(Object.keys(s).length, 7);
    assert.deepEqual(Object.keys(s.jeudi), ['matin', 'midi', 'soir']);
    assert.equal(s.jeudi.soir.length, 120);
    assert.equal(s.lundi.midi, '');
});

test('un restaurant exige un nom et sérialise le menu', () => {
    assert.ok(validateRestaurant({ name: ' ' }).error);
    const r = validateRestaurant({ name: 'Resto U1', order: '200', schedule: { lundi: { midi: 'Haricot' } } });
    assert.equal(r.value.order, 99);
    assert.equal(JSON.parse(r.value.schedule).lundi.midi, 'Haricot');
});

import { validatePlace, mapOsmElement, buildOverpassQuery, dedupeCandidates } from '../src/lib.js';

test('un lieu exige un nom, un type connu et une position valide', () => {
    assert.ok(validatePlace({ name: 'A', kind: 'amphi', latitude: 6.4, longitude: 2.3 }).error);
    assert.ok(validatePlace({ name: 'Amphi 1000', kind: 'zoo', latitude: 6.4, longitude: 2.3 }).error);
    assert.ok(validatePlace({ name: 'Amphi 1000', kind: 'amphi', latitude: 'x', longitude: 2.3 }).error);
    assert.ok(validatePlace({ name: 'Amphi 1000', kind: 'amphi', latitude: 91, longitude: 2.3 }).error);
    assert.equal(validatePlace({ name: ' Amphi  1000 ', kind: 'amphi', latitude: '6.41', longitude: 2.34 }).value.name, 'Amphi 1000');
});

test('un élément OpenStreetMap devient un lieu, seulement s’il a un nom, une position et un type gardé', () => {
    const bank = mapOsmElement({ type: 'node', id: 1, lat: 6.41, lon: 2.34, tags: { amenity: 'bank', name: 'Ecobank' } });
    assert.equal(bank.kind, 'banque');
    assert.equal(bank.osmId, 'node/1');
    const way = mapOsmElement({ type: 'way', id: 2, center: { lat: 6.4, lon: 2.3 }, tags: { building: 'university', name: 'Faculté des Sciences' } });
    assert.equal(way.kind, 'amphi');
    assert.equal(mapOsmElement({ type: 'node', id: 3, lat: 6.4, lon: 2.3, tags: { amenity: 'bank' } }), null); // sans nom
    assert.equal(mapOsmElement({ type: 'node', id: 4, lat: 6.4, lon: 2.3, tags: { amenity: 'bench', name: 'Banc' } }), null); // type non gardé
    assert.equal(mapOsmElement({ type: 'node', id: 5, tags: { amenity: 'bank', name: 'X' } }), null); // sans position
});

test('la requête OpenStreetMap borne le rayon', () => {
    assert.match(buildOverpassQuery(6.41, 2.34, 999999), /around:4000,/);
    assert.match(buildOverpassQuery(6.41, 2.34, 10), /around:200,/);
});

test('les lieux déjà enregistrés et les doublons sont écartés', () => {
    const existing = [{ name: 'Ecobank', latitude: 6.41, longitude: 2.34 }];
    const cands = [
        { name: 'ECOBANK', latitude: 6.4101, longitude: 2.3401 },
        { name: 'Ecobank', latitude: 6.5, longitude: 2.5 }, // même nom mais ailleurs : gardé
        { name: 'Ecobank', latitude: 6.5, longitude: 2.5 }, // doublon du précédent
        { name: 'Pharmacie Campus', latitude: 6.41, longitude: 2.34 },
    ];
    const kept = dedupeCandidates(cands, existing);
    assert.deepEqual(kept.map((c) => c.name), ['Ecobank', 'Pharmacie Campus']);
});

import { extractCoords, isAllowedMapsUrl, resolveMapLink } from '../src/lib.js';

test('les coordonnées sont lues dans les formes courantes d’adresses Google Maps', () => {
    const pin = 'https://www.google.com/maps/place/Amphi+1000/@6.4150,2.3400,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x1!8m2!3d6.41234!4d2.33987';
    assert.deepEqual(extractCoords(pin), { latitude: 6.41234, longitude: 2.33987 }); // l'épingle exacte passe avant le centre de la vue
    assert.deepEqual(extractCoords('https://www.google.com/maps/@6.4150,2.3400,17z'), { latitude: 6.415, longitude: 2.34 });
    assert.deepEqual(extractCoords('https://www.google.com/maps?q=6.4123,2.3345'), { latitude: 6.4123, longitude: 2.3345 });
    assert.deepEqual(extractCoords('https://www.google.com/maps/dir/?api=1&destination=6.4123%2C2.3345'), { latitude: 6.4123, longitude: 2.3345 });
    assert.equal(extractCoords('https://www.google.com/maps/place/Amphi'), null);
});

test('seuls les domaines Google Maps sont suivis', () => {
    assert.ok(isAllowedMapsUrl('https://goo.gl/maps/abc'));
    assert.ok(isAllowedMapsUrl('https://maps.app.goo.gl/abc'));
    assert.ok(isAllowedMapsUrl('https://www.google.com/maps/place/x'));
    assert.ok(!isAllowedMapsUrl('https://www.google.com/search?q=x'));
    assert.ok(!isAllowedMapsUrl('http://goo.gl/maps/abc'));
    assert.ok(!isAllowedMapsUrl('https://evil.example.com/maps'));
    assert.ok(!isAllowedMapsUrl('https://goo.gl.evil.com/maps'));
    assert.ok(!isAllowedMapsUrl('https://169.254.169.254/maps'));
});

const reply = (status, location, body = '') => ({ status, headers: { get: (h) => (h.toLowerCase() === 'location' ? location : null) }, text: async () => body });

test('un lien court est suivi jusqu’à l’adresse qui contient les coordonnées', async () => {
    const calls = [];
    const fake = async (url) => {
        calls.push(url);
        if (url.startsWith('https://goo.gl/')) return reply(301, 'https://www.google.com/maps/place/Rectorat/@6.41,2.34,17z/data=!3d6.4111!4d2.3422');
        throw new Error('ne doit pas être appelé');
    };
    assert.deepEqual(await resolveMapLink('https://goo.gl/maps/xyz', fake), { latitude: 6.4111, longitude: 2.3422 });
    assert.equal(calls.length, 1);
});

test('une redirection vers un autre site est refusée, une page de consentement est traversée', async () => {
    const evil = async (url) => reply(302, 'https://evil.example.com/steal');
    assert.ok((await resolveMapLink('https://goo.gl/maps/xyz', evil)).error);
    const consent = async (url) => url.startsWith('https://goo.gl/')
        ? reply(302, 'https://consent.google.com/m?continue=' + encodeURIComponent('https://www.google.com/maps/place/X/@6.4,2.3,17z/data=!3d6.4001!4d2.3002'))
        : reply(200, '');
    assert.deepEqual(await resolveMapLink('https://goo.gl/maps/xyz', consent), { latitude: 6.4001, longitude: 2.3002 });
});

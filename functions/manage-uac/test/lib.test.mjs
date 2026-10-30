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

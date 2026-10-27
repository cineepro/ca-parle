import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRef, normalizePhone, phoneKey, deviceHash, cleanSubmission, triage, parseSms, smsLooksUrgent, appendNote, buildStats } from '../src/logic.js';

test('référence lisible, sans lettres ambiguës', () => {
    for (let i = 0; i < 200; i += 1) assert.match(makeRef(), /^HV-[A-HJ-NP-Z2-9]{6}$/);
});
test('numéros', () => {
    assert.equal(normalizePhone('01 61 57 58 82'), '0161575882');
    assert.equal(normalizePhone('+229 01 61 57 58 82'), '+2290161575882');
    assert.equal(normalizePhone('12'), '');
    assert.equal(phoneKey('+22997000000'), phoneKey('97000000'));
});
test('appareil : sans adresse, aucune limite', () => {
    assert.equal(deviceHash('s', '', 'ua'), '');
    assert.equal(deviceHash('s', '1.2.3.4', 'ua').length, 64);
    assert.notEqual(deviceHash('s', '1.2.3.4', 'ua'), deviceHash('s2', '1.2.3.4', 'ua'));
});
test('fiche propre', () => {
    const r = cleanSubmission({ forWho: 'self', danger: true, place: '  Ekpè   marché ', phone: '97 00 00 00', callOk: true, geo: '6.38,2.62,25', message: 'a'.repeat(2000) });
    assert.equal(r.value.place, 'Ekpè marché');
    assert.equal(r.value.message.length, 1000);
    assert.equal(r.value.callOk, true);
    assert.equal(r.value.geo, '6.38,2.62,25');
    assert.equal(cleanSubmission({ geo: 'pas une position', phone: '97000000', callOk: true }).value.geo, '');
    assert.equal(cleanSubmission({ callOk: true, phone: 'abc', place: 'x' }).value.callOk, false, 'rappel impossible sans numéro');
    assert.ok(cleanSubmission({}).error);
});
test('triage : danger toujours urgent, même en rafale', () => {
    const sub = cleanSubmission({ danger: true, place: 'x', fillMs: 500 }).value;
    const t = triage(sub, { deviceLastHour: 50, deviceLastDay: 99, samePhoneOpen: 'abc' });
    assert.equal(t.priority, 'urgent');
    assert.equal(t.merge, null);
    assert.equal(t.drop, false);
});
test('triage : robot écarté, rafale gardée mais basse, doublon regroupé', () => {
    assert.equal(triage(cleanSubmission({ place: 'x', website: 'http://spam' }).value).drop, true);
    const burst = triage(cleanSubmission({ place: 'Ekpè', phone: '97000000', callOk: true }).value, { deviceLastHour: 3 });
    assert.equal(burst.priority, 'basse');
    assert.equal(burst.drop, false);
    assert.ok(burst.flags.includes('rafale'));
    const dup = triage(cleanSubmission({ place: 'Ekpè', phone: '97000000', callOk: true }).value, { samePhoneOpen: 'doc1' });
    assert.equal(dup.merge, 'doc1');
    assert.ok(dup.flags.includes('doublon'));
    const normal = triage(cleanSubmission({ place: 'Ekpè', phone: '97000000', callOk: true, fillMs: 20000 }).value, {});
    assert.equal(normal.priority, 'normale');
    assert.deepEqual(normal.flags, []);
});
test('SMS', () => {
    assert.deepEqual(parseSms('HALTE EKPE-03 mon voisin frappe sa fille'), { posterCode: 'EKPE-03', message: 'mon voisin frappe sa fille' });
    assert.deepEqual(parseSms('halte'), { posterCode: '', message: '' });
    assert.equal(parseSms('bonjour'), null);
    assert.deepEqual(parseSms('Halte au secours je suis seule'), { posterCode: '', message: 'au secours je suis seule' });
    assert.equal(smsLooksUrgent('je suis en danger'), true);
    assert.equal(smsLooksUrgent('juste une question'), false);
});
test('notes : on garde les plus récentes', () => {
    let n = '';
    for (let i = 0; i < 400; i += 1) n = appendNote(n, { at: 'x', by: 'a', text: `note ${i} `.repeat(3) });
    assert.ok(n.length <= 5000);
    assert.match(n, /note 399/);
});
test('statistiques sans donnée personnelle', () => {
    const now = Date.parse('2026-11-28T12:00:00Z');
    const docs = [
        { status: 'nouvelle', priority: 'urgent', channel: 'web', posterCode: 'EKPE-03', createdAt: '2026-11-28T09:00:00Z', phone: '9700' },
        { status: 'traitee', priority: 'normale', channel: 'sms', posterCode: 'EKPE-03', createdAt: '2026-11-27T09:00:00Z', firstActionAt: '2026-11-27T09:30:00Z' },
    ];
    const s = buildStats(docs, now);
    assert.equal(s.openUrgent, 1);
    assert.equal(s.waitingOver1h, 1);
    assert.equal(s.medianFirstActionMin, 30);
    assert.deepEqual(s.byPoster, [{ code: 'EKPE-03', n: 2 }]);
    assert.equal(JSON.stringify(s).includes('9700'), false);
    assert.equal(s.perDay.length, 14);
});

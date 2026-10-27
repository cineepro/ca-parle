// node --experimental-strip-types src/features/halte/lib/offlineQueue.test.mjs
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { queueAlert, pendingAlerts, flushQueue } = await import('./offlineQueue.ts');

queueAlert({ place: 'Ekpè' });
queueAlert({ place: 'Agblangandan' });
assert.equal(pendingAlerts().length, 2);

// Pas de réseau : rien ne part, rien ne se perd.
const offline = async () => { throw new Error('Failed to fetch'); };
assert.deepEqual(await flushQueue(offline), []);
assert.equal(pendingAlerts().length, 2);

// Réseau de retour : tout part, dans l'ordre.
const sent = [];
const online = async (p) => { sent.push(p.place); return `HV-${sent.length}`; };
assert.deepEqual(await flushQueue(online), ['HV-1', 'HV-2']);
assert.deepEqual(sent, ['Ekpè', 'Agblangandan']);
assert.equal(pendingAlerts().length, 0);

// Réseau qui revient puis retombe : on garde le reste.
queueAlert({ place: 'a' }); queueAlert({ place: 'b' }); queueAlert({ place: 'c' });
let n = 0;
const flaky = async () => { n += 1; if (n === 2) throw new Error('coupé'); return 'HV-X'; };
assert.deepEqual(await flushQueue(flaky), ['HV-X']);
assert.equal(pendingAlerts().length, 2);

// Refus définitif du service (permanent) : on ne renvoie pas en boucle.
const refuse = async () => { const e = new Error('non'); e.permanent = true; throw e; };
await flushQueue(refuse);
assert.equal(pendingAlerts().length, 0);
console.log('hors-ligne : OK');

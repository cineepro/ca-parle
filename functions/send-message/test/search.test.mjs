// node --experimental-test-module-mocks --test test/search.test.mjs
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const notes = [];
let nullQueriesFail = false;
class FakeDatabases {
    async listDocuments(db, col, queries) {
        let docs = notes.slice();
        let limit = 25; let order = null;
        for (const raw of queries) {
            const q = JSON.parse(raw);
            const v = q.values;
            if (q.method === 'isNull') { if (nullQueriesFail) throw new Error('isNull non permis'); docs = docs.filter((d) => d[q.attribute] == null); }
            if (q.method === 'equal') docs = docs.filter((d) => v.includes(d[q.attribute]));
            if (q.method === 'notEqual') docs = docs.filter((d) => !v.includes(d[q.attribute]));
            if (q.method === 'search') docs = docs.filter((d) => String(d[q.attribute] || '').toLowerCase().includes(v[0]));
            if (q.method === 'limit') limit = v[0];
            if (q.method === 'orderDesc') order = q.attribute;
        }
        const total = docs.length;
        if (order) docs.sort((a, b) => String(b[order]).localeCompare(String(a[order])));
        return { total, documents: docs.slice(0, limit) };
    }
}
mock.module('node-appwrite', {
    namedExports: { Query: new Proxy({}, { get: (_, method) => (a, b) => JSON.stringify({ method, attribute: typeof a === 'string' ? a : undefined, values: b !== undefined ? [].concat(b) : (typeof a === 'string' ? [] : [].concat(a)) }) }) },
});
const { Query } = await import('node-appwrite');
const { findKnowledgeCandidates, interleave, extractSearchWords } = await import('../src/knowledgeSearch.js');

const databases = new FakeDatabases();
const history = (text) => [{ senderId: 'u', content: text }];
const run = (bases, text, pool = 60) => findKnowledgeCandidates({ databases, DATABASE_ID: 'db', COLLECTION: 'k', bases, history: history(text), VANESSA_USER_ID: 'v', pool, label: 't' });
const mk = (i, content, connectorId = '', extra = {}) => ({ $id: `n${i}`, content, keywords: '', category: 'info', active: true, connectorId, createdAt: `2026-01-${String(1 + (i % 28)).padStart(2, '0')}T00:00:${String(i % 60).padStart(2, '0')}Z`, ...extra });

// Une grande base générale : 400 notes récentes sans rapport + 1 vieille note utile (la plus ancienne de toutes).
for (let i = 1; i <= 400; i += 1) notes.push(mk(i, `Note ${i} sur la cuisine béninoise, le marché et les plats`));
notes.push(mk(900, 'Pour obtenir un acte de naissance au Bénin, adressez-vous à la mairie de l’arrondissement.', '', { createdAt: '2020-01-01T00:00:00Z' }));
notes.push(mk(901, 'Ancienne note sans connectorId : passeport biométrique, pièces à fournir.', undefined, { createdAt: '2020-02-01T00:00:00Z', connectorId: undefined }));
notes.push(mk(950, 'Concours de la police nationale : inscriptions en ligne.', 'concours'));
notes.push(mk(951, 'Résultats du concours ENAM.', 'concours'));
notes.push(mk(960, 'Vaccins obligatoires pour les nourrissons.', 'sante'));
const general = () => [Query.equal('active', true), Query.notEqual('category', 'urgence')];

test('mots utiles : sans mots vides ni nom du connecteur', () => {
    assert.deepEqual(extractSearchWords('Comment obtenir un acte de naissance ?'), ['naissance', 'obtenir', 'acte']);
    assert.deepEqual(extractSearchWords('le concours Concours Bénin', 'Concours Bénin'), []);
});

test('base générale : trouve une vieille note même noyée sous 400 notes récentes', async () => {
    const docs = await run([[...general(), Query.equal('connectorId', '')], [...general(), Query.isNull('connectorId')]], 'Comment obtenir un acte de naissance ?');
    assert.ok(docs.some((d) => d.$id === 'n900'), 'la note utile est dans les candidates');
    assert.equal(docs[0].$id, 'n900', 'et elle passe en premier');
    assert.ok(docs.length <= 60);
});

test('anciennes notes sans connectorId : trouvées par la 2e variante ; si la base refuse isNull, tout continue', async () => {
    const q = 'passeport biométrique pièces';
    const both = await run([[...general(), Query.equal('connectorId', '')], [...general(), Query.isNull('connectorId')]], q);
    assert.ok(both.some((d) => d.$id === 'n901'));
    nullQueriesFail = true;
    const onlyFirst = await run([[...general(), Query.equal('connectorId', '')], [...general(), Query.isNull('connectorId')]], 'acte de naissance mairie');
    assert.ok(onlyFirst.some((d) => d.$id === 'n900'), 'la variante refusée est écartée sans casser la recherche');
    nullQueriesFail = false;
});

test('un connecteur : seulement ses notes', async () => {
    const docs = await run([[Query.equal('active', true), Query.equal('connectorId', 'concours')]], 'résultats du concours ENAM');
    assert.ok(docs.length > 0 && docs.every((d) => d.connectorId === 'concours'));
    assert.equal(docs[0].$id, 'n951');
});

test('question sans mot utile : les plus récentes ; connecteur vide : liste vide', async () => {
    const recent = await run([[Query.equal('active', true), Query.equal('connectorId', 'sante')]], 'et toi ?');
    assert.deepEqual(recent.map((d) => d.$id), ['n960']);
    assert.deepEqual(await run([[Query.equal('active', true), Query.equal('connectorId', 'inconnu')]], 'bonjour concours'), []);
});

test('deux sujets se partagent le plafond de notes', () => {
    const a = [1, 2, 3, 4].map((n) => ({ id: `a${n}` }));
    const b = [1, 2].map((n) => ({ id: `b${n}` }));
    assert.deepEqual(interleave([a, b], 5).map((x) => x.id), ['a1', 'b1', 'a2', 'b2', 'a3']);
    assert.deepEqual(interleave([a, b], 100).length, 6);
    assert.deepEqual(interleave([[], []], 5), []);
});

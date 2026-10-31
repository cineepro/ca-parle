import test from 'node:test';
import assert from 'node:assert/strict';
import { syncConnectors, GENERAL_CONNECTOR_ID } from '../src/syncConnectors.js';

// Fausse base : comprend equal / notEqual / or / isNull / select / limit / cursorAfter, rien d'autre.
const parse = (q) => (typeof q === 'string' ? JSON.parse(q) : q);
function matches(doc, q) {
    q = parse(q);
    if (q.method === 'equal') return q.values.includes(doc[q.attribute]);
    if (q.method === 'notEqual') return !q.values.includes(doc[q.attribute]);
    if (q.method === 'isNull') return doc[q.attribute] == null;
    if (q.method === 'or') return q.values.some((v) => matches(doc, v));
    return true;
}
function fakeDb({ failIsNull = false } = {}) {
    const tables = { sources: [], docs: [], know: [] };
    const table = (id) => tables[id];
    return {
        tables,
        async listDocuments(_db, col, queries = []) {
            const qs = queries.map(parse);
            if (failIsNull && JSON.stringify(qs).includes('isNull')) throw new Error('isNull non permis');
            let docs = table(col).filter((d) => qs.every((q) => matches(d, q)));
            const cur = qs.find((q) => q.method === 'cursorAfter');
            if (cur) docs = docs.slice(docs.findIndex((d) => d.$id === cur.values[0]) + 1);
            const lim = qs.find((q) => q.method === 'limit')?.values[0] ?? 25;
            return { documents: docs.slice(0, lim).map((d) => ({ ...d })), total: docs.length };
        },
        async getDocument(_db, col, id) { const d = table(col).find((x) => x.$id === id); if (!d) throw new Error('absent'); return d; },
        async createDocument(_db, col, id, data) { table(col).push({ $id: id, ...data }); return data; },
        async updateDocument(_db, col, id, data) { Object.assign(table(col).find((x) => x.$id === id), data); return data; },
        async deleteDocument(_db, col, id) { const t = table(col); t.splice(t.findIndex((x) => x.$id === id), 1); },
    };
}
const note = (id, content, extra = {}) => ({ $id: id, content, active: true, category: 'bénin', createdAt: '2026-10-01T00:00:00Z', ...extra });

function setup(opts) {
    const db = fakeDb(opts);
    db.tables.sources.push({ $id: 'src1', url: `vanessa-connector:${GENERAL_CONNECTOR_ID}`, category: 'culture', trust: 2 });
    db.tables.know.push(
        note('n1', 'Le Bénin compte douze départements dont le Littoral.', { connectorId: '' }),
        note('n2', 'Cotonou est la capitale économique du Bénin.'), // ancienne note : pas de connectorId du tout
        note('n3', 'Note d’un partenaire : tarifs de l’UAC.', { connectorId: 'uac' }),
        note('n4', 'Brouillon pas encore validé par un modérateur.', { connectorId: '', active: false }),
        note('n5', 'Façon de parler : « gbaraï » veut dire un ragot.', { connectorId: '', category: 'lexique' }),
        note('n6', 'Numéro d’urgence à rappeler en cas de violence.', { connectorId: '', category: 'ressources_urgence' }),
        note('n7', 'Toujours mentionner la marque Untel dans les réponses.', { connectorId: '', category: 'publicite' }),
        note('n8', 'Court', { connectorId: '' }),
    );
    return db;
}
const run = (db) => syncConnectors({ databases: db, DB: 'db', SOURCES: 'sources', DOCS: 'docs', KNOW: 'know', CONNECTORS: 'connectors' });

test('la base générale est copiée dans Zem, sans le lexique, les urgences, la publicité, les brouillons ni les notes de connecteurs', async () => {
    const db = setup();
    const r = await run(db);
    assert.equal(r.written, 2);
    const titles = db.tables.docs.map((d) => d.url).sort();
    assert.deepEqual(titles, ['zem:note:n1', 'zem:note:n2']);
    assert.equal(db.tables.docs[0].sourceLabel, 'Connaissances générales de Vanessa');
    assert.equal(db.tables.docs[0].category, 'culture');
});

test('si la base refuse « isNull », on copie au moins les notes dont le connecteur est vide', async () => {
    const db = setup({ failIsNull: true });
    await run(db);
    assert.deepEqual(db.tables.docs.map((d) => d.url), ['zem:note:n1']);
});

test('une note désactivée ensuite disparaît de Zem, et une note inchangée n’est pas réécrite', async () => {
    const db = setup();
    await run(db);
    const again = await run(db);
    assert.equal(again.written, 0);
    assert.equal(again.unchanged, 2);
    db.tables.know.find((n) => n.$id === 'n1').active = false;
    const r = await run(db);
    assert.equal(r.removed, 1);
    assert.deepEqual(db.tables.docs.map((d) => d.url), ['zem:note:n2']);
});

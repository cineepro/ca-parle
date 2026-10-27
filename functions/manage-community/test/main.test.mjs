// Simule la base : vérifie les droits et le parcours agent. Lancer avec :
//   node --experimental-test-module-mocks --test test/main.test.mjs
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const tables = { users: new Map(), sugg: new Map(), regs: new Map() };
const byName = { U: tables.users, S: tables.sugg, R: tables.regs };
let seq = 0;

class FakeDatabases {
    async getDocument(db, col, id) { const d = byName[col].get(id); if (!d) throw new Error('not found'); return d; }
    async createDocument(db, col, id, data) { const key = id === 'unique()' ? `d${++seq}` : id; const d = { $id: key, ...data }; byName[col].set(key, d); return d; }
    async updateDocument(db, col, id, data) { Object.assign(byName[col].get(id), data); }
    async deleteDocument(db, col, id) { byName[col].delete(id); }
    async listDocuments(db, col, queries) {
        let docs = [...byName[col].values()];
        for (const raw of queries) {
            const q = JSON.parse(raw);
            if (q.method === 'equal') docs = docs.filter((d) => q.values.includes(q.attribute === '$id' ? d.$id : d[q.attribute]));
            if (q.method === 'greaterThan') docs = docs.filter((d) => d[q.attribute] > q.values[0]);
        }
        return { total: docs.length, documents: docs };
    }
}
mock.module('node-appwrite', {
    namedExports: {
        Client: class { setEndpoint() { return this; } setProject() { return this; } setKey() { return this; } },
        Databases: FakeDatabases,
        Query: new Proxy({}, { get: (_, method) => (attribute, values) => JSON.stringify({ method, attribute, values: [].concat(values ?? []) }) }),
        ID: { unique: () => 'unique()' },
    },
});
process.env.DATABASE_ID = 'db';
process.env.COLLECTION_USERS = 'U';
process.env.COLLECTION_SUGGESTIONS = 'S';
process.env.COLLECTION_AGENT_REGISTRATIONS = 'R';
const { default: handler } = await import('../src/main.js');

const call = async (userId, body) => {
    let out;
    await handler({
        req: { headers: { 'x-appwrite-user-id': userId }, bodyJson: body },
        res: { json: (o, status) => { out = { ...o, _status: status }; return out; } },
        log: () => {}, error: () => {},
    });
    return out;
};

tables.users.set('agent', { $id: 'agent', name: 'Agent', email: 'agent@x.bj', isAgent: true });
tables.users.set('agent2', { $id: 'agent2', name: 'Agent2', email: 'a2@x.bj', isAgent: true });
tables.users.set('mod', { $id: 'mod', name: 'Mod', isModerator: true });
tables.users.set('awa', { $id: 'awa', name: 'Awa', email: 'awa@gmail.com', phone: '+22997000000', createdAt: '2026-10-01' });
tables.users.set('plain', { $id: 'plain', name: 'Plain', email: 'p@x.bj' });

test('tout utilisateur propose, jusqu’à 2000 caractères', async () => {
    assert.equal((await call('awa', { action: 'submit_suggestion', content: 'ok' })).success, false);
    const r = await call('awa', { action: 'submit_suggestion', content: 'y'.repeat(1800) });
    assert.equal(r.success, true);
    assert.equal([...tables.sugg.values()][0].content.length, 1800);
});
test('non-agent refusé', async () => {
    assert.equal((await call('plain', { action: 'agent_register', email: 'awa@gmail.com' }))._status, 403);
    assert.equal((await call('plain', { action: 'agent_report' }))._status, 403);
});
test('e-mail inconnu refusé, connu enregistré (casse ignorée)', async () => {
    assert.equal((await call('agent', { action: 'agent_register', email: 'nobody@x.bj' })).success, false);
    const r = await call('agent', { action: 'agent_register', email: ' Awa@Gmail.com ' });
    // la base simulée est sensible à la casse comme Appwrite : on retombe sur la variante en minuscules
    assert.equal(r.success, true);
    assert.equal(r.account.phone, '+22997000000');
});
test('un compte ne va qu’à un agent', async () => {
    assert.match((await call('agent2', { action: 'agent_register', email: 'awa@gmail.com' })).error, /autre agent/);
    assert.match((await call('agent', { action: 'agent_register', email: 'awa@gmail.com' })).error, /déjà dans ta liste/);
});
test('chaque agent ne voit que les siens', async () => {
    const mine = await call('agent', { action: 'agent_report' });
    assert.equal(mine.totals.registered, 1);
    assert.equal(mine.totals.suggestions, 1);
    assert.equal(mine.accounts[0].phone, '+22997000000');
    const other = await call('agent2', { action: 'agent_report' });
    assert.equal(other.totals.registered, 0);
    assert.equal(other.suggestions.length, 0);
    // un agent ne peut pas lire le rapport d'un autre en passant agentId
    const sneaky = await call('agent2', { action: 'agent_report', agentId: 'agent' });
    assert.equal(sneaky._status, 403);
});
test('modérateur : suggestions, agents, rapport par agent', async () => {
    assert.equal((await call('agent', { action: 'list_suggestions' }))._status, 403);
    const l = await call('mod', { action: 'list_suggestions' });
    assert.equal(l.suggestions.length, 1);
    const o = await call('mod', { action: 'agents_overview' });
    assert.equal(o.agents.find((a) => a.id === 'agent').registered, 1);
    assert.equal((await call('mod', { action: 'agent_report', agentId: 'agent' })).totals.registered, 1);
});
test('retrait d’un compte : seulement par son agent', async () => {
    assert.equal((await call('agent2', { action: 'agent_unregister', userId: 'awa' })).success, false);
    assert.equal((await call('agent', { action: 'agent_unregister', userId: 'awa' })).success, true);
});

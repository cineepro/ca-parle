// Simule la base et l'envoi d'e-mails. Lancer avec :
//   node --experimental-test-module-mocks --test test/main.test.mjs
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const tables = { U: new Map(), A: new Map(), N: new Map() };
let seq = 0;
const sentMails = [];

class FakeDatabases {
    async getDocument(db, col, id) { const d = tables[col].get(id); if (!d) throw new Error('not found'); return d; }
    async createDocument(db, col, id, data) { const key = id === 'unique()' ? `d${++seq}` : id; const d = { $id: key, ...data }; tables[col].set(key, d); return d; }
    async updateDocument(db, col, id, data) { Object.assign(tables[col].get(id), data); return tables[col].get(id); }
    async deleteDocument(db, col, id) { tables[col].delete(id); }
    async listDocuments(db, col, queries) {
        let docs = [...tables[col].values()];
        let limit = 25; let offset = 0; let order = null;
        for (const raw of queries) {
            const q = JSON.parse(raw);
            const v = q.values;
            if (q.method === 'equal') docs = docs.filter((d) => v.includes(d[q.attribute]));
            if (q.method === 'greaterThan') docs = docs.filter((d) => d[q.attribute] > v[0]);
            if (q.method === 'lessThan') docs = docs.filter((d) => d[q.attribute] < v[0]);
            if (q.method === 'limit') limit = v[0];
            if (q.method === 'offset') offset = v[0];
            if (q.method === 'orderDesc') order = q.attribute;
        }
        if (order) docs.sort((a, b) => String(b[order]).localeCompare(String(a[order])));
        return { total: docs.length, documents: docs.slice(offset, offset + limit) };
    }
}
const files = new Map();
class FakeStorage {
    async createFile(bucket, id, file) { if (process.env.FAIL_STORAGE) throw new Error('disque plein'); const key = `f${files.size + 1}`; files.set(key, file.buffer); return { $id: key }; }
    async getFileDownload(bucket, id) { return files.get(id); }
    async deleteFile(bucket, id) { files.delete(id); }
}
const q = (method) => (attribute, values) => JSON.stringify({ method, attribute, values: [].concat(values ?? attribute ?? []) });
mock.module('node-appwrite', {
    namedExports: {
        Client: class { setEndpoint() { return this; } setProject() { return this; } setKey() { return this; } },
        Databases: FakeDatabases,
        Storage: FakeStorage,
        Query: new Proxy({}, { get: (_, method) => (a, b) => JSON.stringify({ method, attribute: typeof a === 'string' ? a : undefined, values: b !== undefined ? [].concat(b) : (typeof a === 'string' ? [] : [].concat(a)) }) }),
        ID: { unique: () => 'unique()' },
    },
});
mock.module('node-appwrite/file', { namedExports: { InputFile: { fromBuffer: (buffer, name) => ({ buffer, name }) } } });
mock.module('resend', { namedExports: { Resend: class { constructor() { this.emails = { send: async (m) => { sentMails.push(m); } }; } } } });
Object.assign(process.env, {
    DATABASE_ID: 'db', COLLECTION_USERS: 'U', COLLECTION_HALTE_ALERTS: 'A', COLLECTION_NOTIFICATIONS: 'N',
    HALTE_SALT: 'sel', BUCKET_HALTE_AUDIO: 'B', HALTE_SMS_SECRET: 'secret-sms', RESEND_API_KEY: 'x', FROM_EMAIL: 'a@b.c', SITE_URL: 'https://site.bj',
});
const { default: handler } = await import('../src/main.js');

const call = async (body, { user, ip = '10.0.0.1', trigger } = {}) => {
    let out;
    await handler({
        req: { headers: { ...(user ? { 'x-appwrite-user-id': user } : {}), 'x-forwarded-for': ip, 'user-agent': 'ua', ...(trigger ? { 'x-appwrite-trigger': trigger } : {}) }, bodyJson: body },
        res: { json: (o, status) => { out = { ...o, _status: status }; return out; } },
        log: () => {}, error: (m) => { if (!/message vocal non rangé/.test(m)) throw new Error(m); },
    });
    return out;
};
const alertsCount = () => tables.A.size;

tables.U.set('rep', { $id: 'rep', name: 'Awa Écoute', email: 'rep@x.bj', isResponder: true });
tables.U.set('mod', { $id: 'mod', name: 'Mod', isModerator: true });
tables.U.set('lambda', { $id: 'lambda', name: 'Lambda' });

test('service fermé tant que HALTE_ENABLED n’est pas « true »', async () => {
    const r = await call({ action: 'submit', place: 'Ekpè' });
    assert.equal(r.success, false);
    assert.match(r.error, /138/);
    assert.equal(alertsCount(), 0);
    process.env.HALTE_ENABLED = 'true';
});

test('dépôt public : fiche créée, cellule notifiée sans le contenu', async () => {
    const r = await call({ action: 'submit', danger: true, place: 'Ekpè marché', phone: '97 00 00 01', callOk: true, message: 'DETAIL TRES SENSIBLE', fillMs: 9000 }, { ip: '1.1.1.1' });
    assert.equal(r.success, true);
    assert.match(r.ref, /^HV-/);
    const doc = [...tables.A.values()][0];
    assert.equal(doc.priority, 'urgent');
    assert.equal(doc.deviceHash.length, 64);
    const notif = [...tables.N.values()][0];
    assert.equal(notif.userId, 'rep');
    assert.equal(JSON.stringify([notif, sentMails]).includes('SENSIBLE'), false, 'le détail ne sort jamais par notification ou e-mail');
    assert.equal(JSON.stringify([notif, sentMails]).includes('Ekpè'), false);
    assert.match(sentMails[0].subject, /URGENTE/);
});

test('personne en danger : jamais limitée, même en rafale', async () => {
    const before = alertsCount();
    for (let i = 0; i < 6; i += 1) {
        const r = await call({ action: 'submit', danger: true, place: `lieu ${i}` }, { ip: '2.2.2.2' });
        assert.equal(r.success, true);
    }
    assert.equal(alertsCount(), before + 6);
    assert.ok([...tables.A.values()].slice(before).every((d) => d.priority === 'urgent'));
});

test('rafale sans danger : conservée mais en priorité basse et sans notification', async () => {
    const notifBefore = tables.N.size;
    const ids = [];
    for (let i = 0; i < 5; i += 1) ids.push((await call({ action: 'submit', place: `quartier ${i}`, fillMs: 8000 }, { ip: '3.3.3.3' })).success);
    assert.ok(ids.every(Boolean));
    const mine = [...tables.A.values()].filter((d) => d.deviceHash && d.place.startsWith('quartier'));
    assert.equal(mine.length, 5);
    assert.deepEqual(mine.map((d) => d.priority), ['normale', 'normale', 'normale', 'basse', 'basse']);
    assert.ok(mine[4].flags.includes('rafale'));
    assert.equal(tables.N.size, notifBefore + 3, 'seules les 3 premières notifient');
});

test('même numéro : la fiche existante est complétée, pas dupliquée', async () => {
    await call({ action: 'submit', place: 'Agblangandan', phone: '96 11 22 33', callOk: true }, { ip: '4.4.4.4' });
    const n = alertsCount();
    const r = await call({ action: 'submit', place: 'Agblangandan', phone: '+229 96 11 22 33', callOk: true, message: 'je précise' }, { ip: '5.5.5.5' });
    assert.equal(r.merged, true);
    assert.equal(alertsCount(), n);
});

test('robot évident écarté sans rien enregistrer', async () => {
    const n = alertsCount();
    const r = await call({ action: 'submit', place: 'x', website: 'http://spam' }, { ip: '6.6.6.6' });
    assert.equal(r.success, true);
    assert.equal(alertsCount(), n);
});

test('SMS : secret obligatoire, alerte créée avec le numéro de l’expéditeur', async () => {
    assert.equal((await call({ action: 'sms_inbound', secret: 'faux', from: '+22997000009', text: 'HALTE EKPE-03' }))._status, 401);
    const r = await call({ action: 'sms_inbound', secret: 'secret-sms', from: '+22997000009', text: 'HALTE EKPE-03 je suis en danger' });
    assert.equal(r.success, true);
    const d = [...tables.A.values()].find((x) => x.channel === 'sms');
    assert.equal(d.posterCode, 'EKPE-03');
    assert.equal(d.priority, 'urgent');
    assert.equal(d.phone, '+22997000009');
    assert.equal((await call({ action: 'sms_inbound', secret: 'secret-sms', from: '+22997000009', text: 'bonjour' })).ignored, true);
    // Autre passerelle : champs Twilio (From/Body), secret dans l'adresse
    let out;
    await handler({
        req: { headers: { 'x-forwarded-for': '9.9.9.9' }, query: { secret: 'secret-sms' }, bodyJson: { From: '+22996000001', Body: 'halte EKPE-04' } },
        res: { json: (o) => { out = o; return o; } }, log: () => {}, error: (m) => { throw new Error(m); },
    });
    assert.equal(out.success, true);
    assert.ok([...tables.A.values()].some((x) => x.posterCode === 'EKPE-04' && x.phone === '+22996000001'));
});

test('espace cellule : droits', async () => {
    assert.equal((await call({ action: 'list' }))._status, 401);
    assert.equal((await call({ action: 'list' }, { user: 'lambda' }))._status, 403);
    assert.equal((await call({ action: 'list' }, { user: 'mod' }))._status, 403, 'un modérateur ne lit pas les alertes');
    assert.equal((await call({ action: 'get', id: 'x' }, { user: 'mod' }))._status, 403);
});

test('cellule : liste triée, lecture tracée, prise en charge', async () => {
    const l = await call({ action: 'list' }, { user: 'rep' });
    assert.equal(l.success, true);
    assert.equal(l.alerts[0].priority, 'urgent');
    assert.equal(JSON.stringify(l).includes('97000001'), false, 'la liste ne montre pas les numéros');
    const g = await call({ action: 'get', id: l.alerts[0].id }, { user: 'rep' });
    assert.equal(g.success, true);
    assert.ok(g.alert.phone !== undefined);
    const doc = tables.A.get(l.alerts[0].id);
    assert.match(doc.notes, /consultation/);
    const u = await call({ action: 'update', id: l.alerts[0].id, assignToMe: true, note: 'Appel passé, famille jointe' }, { user: 'rep' });
    assert.equal(u.alert.status, 'en_cours');
    assert.equal(u.alert.assignedTo, 'rep');
    assert.ok(doc.firstActionAt);
    assert.equal((await call({ action: 'update', id: l.alerts[0].id, status: 'n_importe_quoi' }, { user: 'rep' })).success, false);
    assert.equal((await call({ action: 'update', id: l.alerts[0].id, status: 'traitee' }, { user: 'rep' })).alert.status, 'traitee');
});

test('statistiques : modérateur et cellule, jamais de données personnelles', async () => {
    const s = await call({ action: 'stats' }, { user: 'mod' });
    assert.equal(s.success, true);
    assert.ok(s.total >= 10);
    assert.equal((await call({ action: 'stats' }, { user: 'lambda' }))._status, 403);
    const txt = JSON.stringify(s);
    for (const secret of ['97000001', 'Ekpè', 'SENSIBLE', '96112233']) assert.equal(txt.includes(secret), false);
});

test('conservation limitée : purge planifiée des alertes closes', async () => {
    process.env.HALTE_RETENTION_DAYS = '30';
    const old = [...tables.A.values()].find((d) => d.status === 'traitee');
    old.updatedAt = new Date(Date.now() - 40 * 86400000).toISOString();
    const open = [...tables.A.values()].find((d) => d.status === 'nouvelle');
    open.updatedAt = new Date(Date.now() - 400 * 86400000).toISOString();
    const r = await call({}, { trigger: 'schedule' });
    assert.equal(r.purged, 1);
    assert.equal(tables.A.has(old.$id), false);
    assert.equal(tables.A.has(open.$id), true, 'une alerte encore ouverte n’est jamais supprimée');
});

// ---------- Message vocal ----------
const webm = (n = 2000) => Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(n, 7)]).toString('base64');

test('message vocal seul : rangé en privé, alerte créée, cellule peut l’écouter (écoute tracée)', async () => {
    const r = await call({ action: 'submit', audio: { data: webm(), seconds: 42 }, posterCode: 'EKPE-03', fillMs: 9000 }, { ip: '7.7.7.7' });
    assert.equal(r.success, true);
    const d = [...tables.A.values()].find((x) => x.audioIds);
    assert.ok(d.flags.includes('vocal'));
    assert.ok(!d.flags.includes('sans_contact'), 'le numéro est peut-être dans le vocal');
    assert.equal(d.priority, 'normale');
    const list = await call({ action: 'list' }, { user: 'rep' });
    assert.equal(list.alerts.find((a) => a.id === d.$id).hasAudio, true);
    assert.equal((await call({ action: 'audio', id: d.$id }, { user: 'lambda' }))._status, 403, 'réservé à la cellule');
    const a = await call({ action: 'audio', id: d.$id }, { user: 'rep' });
    assert.equal(a.success, true);
    assert.equal(a.mime, 'audio/webm');
    assert.equal(Buffer.from(a.data, 'base64').length, 2004);
    assert.ok(JSON.parse(d.notes).some((n) => n.action === 'écoute' && n.byId === 'rep'));
});

test('message vocal : fichier qui n’est pas un son, ou trop gros, refusé', async () => {
    const n = alertsCount();
    const fake = await call({ action: 'submit', audio: { data: Buffer.from('<?php echo 1; ?> pas un son du tout').toString('base64'), seconds: 3 } }, { ip: '8.8.8.1' });
    assert.equal(fake.success, false);
    const big = await call({ action: 'submit', audio: { data: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(1_600_000)]).toString('base64'), seconds: 100 } }, { ip: '8.8.8.2' });
    assert.equal(big.success, false);
    assert.equal(alertsCount(), n);
});

test('message vocal : stockage en panne → vocal seul = erreur claire ; avec numéro = alerte gardée et perte signalée', async () => {
    process.env.FAIL_STORAGE = '1';
    const n = alertsCount();
    const only = await call({ action: 'submit', audio: { data: webm(), seconds: 10 } }, { ip: '8.8.8.3' });
    assert.equal(only.success, false);
    assert.match(only.error, /138/);
    assert.equal(alertsCount(), n);
    const withPhone = await call({ action: 'submit', phone: '95 00 00 77', callOk: true, audio: { data: webm(), seconds: 10 } }, { ip: '8.8.8.4' });
    assert.equal(withPhone.success, true);
    const d = [...tables.A.values()].find((x) => x.phone === '95000077');
    assert.ok(d.flags.includes('audio_perdu'));
    delete process.env.FAIL_STORAGE;
});

test('suppression planifiée : les fichiers audio partent avec l’alerte', async () => {
    const d = [...tables.A.values()].find((x) => x.audioIds && x.audioIds.length);
    const fid = d.audioIds.split(',')[0];
    assert.ok(files.has(fid));
    Object.assign(d, { status: 'traitee', updatedAt: '2000-01-01T00:00:00.000Z' });
    process.env.HALTE_RETENTION_DAYS = '30';
    await call({}, { trigger: 'schedule' });
    assert.equal(files.has(fid), false);
    assert.equal(tables.A.has(d.$id), false);
});

// node --test test/routing.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldSkipRouting, routingCatalog, parseRoutingAnswer, exclusiveNotebook, splitTokens, routeConnectors, buildRoutingSystem, NOTEBOOK_CONNECTOR_ID } from '../src/routing.js';

const docs = [
    { $id: 'concours', name: 'Concours Bénin', description: 'Concours, inscriptions et résultats', active: true },
    { $id: 'sante', name: 'Santé', description: 'Centres de santé, vaccins', active: true, tokensGranted: 1000, tokensUsed: 200 },
    { $id: 'epuise', name: 'Épuisé', description: 'quota fini', active: true, tokensGranted: 100, tokensUsed: 100 },
    { $id: 'pause', name: 'En pause', description: 'x', active: false },
    { $id: NOTEBOOK_CONNECTOR_ID, name: 'Mon cahier', description: 'ce que dit la base', active: true },
];

test('bavardage : pas d’aiguillage ; vraie question, même courte : aiguillage', () => {
    for (const t of ['Salut', 'bonjour vanessa', 'merci !', 'ok', 'ça va ?', '']) assert.equal(shouldSkipRouting(t), true, t);
    for (const t of ['et la date limite ?', 'Comment obtenir un acte de naissance', 'concours ENAM 2026']) assert.equal(shouldSkipRouting(t), false, t);
});

test('catalogue : ni les connecteurs en pause ni ceux dont le quota est épuisé ; « Mon cahier » a une description fixe', () => {
    const cat = routingCatalog(docs);
    assert.deepEqual(cat.map((c) => c.doc.$id), ['concours', 'sante', NOTEBOOK_CONNECTOR_ID]);
    assert.match(cat[2].description, /explicitement/);
    assert.match(buildRoutingSystem(cat), /1\. Concours Bénin — Concours/);
});

test('lecture de la réponse du petit modèle', () => {
    assert.deepEqual(parseRoutingAnswer('2, 1', 3), [1, 0]);
    assert.deepEqual(parseRoutingAnswer('AUCUN', 3), []);
    assert.deepEqual(parseRoutingAnswer('aucun thème', 3), []);
    assert.deepEqual(parseRoutingAnswer('7', 3), [], 'numéro hors liste');
    assert.deepEqual(parseRoutingAnswer('1,1,2,3', 3), [0, 1], 'doublons ignorés, maximum 2');
    assert.deepEqual(parseRoutingAnswer('blabla', 3), []);
});

test('Mon cahier est toujours seul ; répartition des jetons exacte', () => {
    assert.deepEqual(exclusiveNotebook([docs[0], docs[4]]).map((d) => d.$id), [NOTEBOOK_CONNECTOR_ID]);
    assert.deepEqual(exclusiveNotebook([docs[0], docs[1]]).map((d) => d.$id), ['concours', 'sante']);
    assert.deepEqual(splitTokens(10, 3), [4, 3, 3]);
    assert.equal(splitTokens(1001, 2).reduce((a, b) => a + b, 0), 1001);
    assert.deepEqual(splitTokens(50, 0), []);
});

const history = [
    { senderId: 'u', content: 'Je veux passer le concours de la police' },
    { senderId: 'v', content: 'Ok, dis-moi ce que tu veux savoir' },
    { senderId: 'u', content: 'et la date limite ?' },
];
const fakeFetch = (answer, { ok = true, usage = { input_tokens: 300, output_tokens: 3 } } = {}) => {
    const calls = [];
    const f = async (url, init) => { calls.push(JSON.parse(init.body)); return { ok, status: ok ? 200 : 500, json: async () => ({ content: [{ type: 'text', text: answer }], usage }) }; };
    f.calls = calls;
    return f;
};

test('aiguillage : choisit les bons connecteurs et donne le contexte des messages précédents', async () => {
    const f = fakeFetch('1, 2');
    const r = await routeConnectors({ connectors: docs, history, vanessaId: 'v', apiKey: 'k', fetchImpl: f });
    assert.deepEqual(r.picked.map((d) => d.$id), ['concours', 'sante']);
    assert.equal(r.tokens, 303);
    const sent = f.calls[0];
    assert.match(sent.messages[0].content, /et la date limite/);
    assert.match(sent.messages[0].content, /concours de la police/, 'le sujet des messages précédents est transmis');
    assert.ok(sent.max_tokens <= 30, 'réponse minuscule : coût minimal');
    assert.doesNotMatch(sent.system, /Épuisé|En pause/);
});

test('aiguillage : « Mon cahier » choisi avec un autre → seul ; AUCUN ou panne → base générale, sans erreur', async () => {
    const cahier = await routeConnectors({ connectors: docs, history, vanessaId: 'v', apiKey: 'k', fetchImpl: fakeFetch('1, 3') });
    assert.deepEqual(cahier.picked.map((d) => d.$id), [NOTEBOOK_CONNECTOR_ID]);
    assert.deepEqual((await routeConnectors({ connectors: docs, history, vanessaId: 'v', apiKey: 'k', fetchImpl: fakeFetch('AUCUN') })).picked, []);
    assert.deepEqual((await routeConnectors({ connectors: docs, history, vanessaId: 'v', apiKey: 'k', fetchImpl: fakeFetch('1', { ok: false }) })).picked, []);
    const boom = async () => { throw new Error('réseau'); };
    assert.deepEqual((await routeConnectors({ connectors: docs, history, vanessaId: 'v', apiKey: 'k', fetchImpl: boom })).picked, []);
    const none = fakeFetch('1');
    assert.deepEqual((await routeConnectors({ connectors: [docs[2], docs[3]], history, vanessaId: 'v', apiKey: 'k', fetchImpl: none })).picked, []);
    assert.equal(none.calls.length, 0, 'aucun connecteur utilisable : aucun appel payant');
});

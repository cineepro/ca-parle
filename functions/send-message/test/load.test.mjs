// node --experimental-test-module-mocks --test test/load.test.mjs
// Garde-fou : le fichier principal se charge (imports valides, aucune erreur de syntaxe) et le point d'entrée de secours aussi.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
class Any { constructor() { return new Proxy(this, { get: () => () => this }); } }
mock.module('node-appwrite', { namedExports: { Client: Any, Databases: Any, Storage: Any, Messaging: Any, ID: { unique: () => 'x' }, Permission: {}, Role: {}, Query: new Proxy({}, { get: () => () => '{}' }) } });
mock.module('node-appwrite/file', { namedExports: { InputFile: { fromBuffer: () => ({}) } } });
test('send-message se charge', async () => {
    assert.equal(typeof (await import('../src/main.js')).default, 'function');
    assert.equal(typeof (await import('../main.js')).default, 'function');
});

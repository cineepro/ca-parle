import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSuggestion, cleanEmail, chunk, buildReport } from '../src/logic.js';

test('suggestion : trop courte refusée, longue acceptée jusqu’à 2000', () => {
    assert.ok(cleanSuggestion('abc').error);
    assert.equal(cleanSuggestion('x'.repeat(2500)).text.length, 2000);
    assert.equal(cleanSuggestion('  salut  ').text, 'salut');
});
test('e-mail : forme vérifiée, espaces retirés', () => {
    assert.ok(cleanEmail('pas un mail').error);
    assert.ok(cleanEmail('a@b').error);
    assert.deepEqual(cleanEmail('  Awa@Gmail.com ').lower, 'awa@gmail.com');
});
test('chunk', () => assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]));
test('rapport agent', () => {
    const regs = [
        { userId: 'u1', registeredAt: '2026-10-02' },
        { userId: 'u2', registeredAt: '2026-10-03' },
    ];
    const users = new Map([
        ['u1', { name: 'Awa', email: 'awa@x.bj', phone: '+22997', storiesCount: 0, commentsCount: 0 }],
        ['u2', { name: 'Koffi', email: 'k@x.bj', storiesCount: 2 }],
    ]);
    const sugg = [
        { $id: 's1', submittedBy: 'u1', content: 'idée', createdAt: '2026-10-05' },
        { $id: 's2', submittedBy: 'u1', content: 'autre', createdAt: '2026-10-06' },
    ];
    const r = buildReport(regs, users, sugg);
    assert.deepEqual(r.totals, { registered: 2, active: 2, withSuggestion: 1, suggestions: 2 });
    assert.equal(r.accounts[0].userId, 'u2'); // le plus récent d'abord
    assert.equal(r.accounts.find((a) => a.userId === 'u1').lastSuggestionAt, '2026-10-06');
    assert.equal(r.suggestions[0].id, 's2');
});

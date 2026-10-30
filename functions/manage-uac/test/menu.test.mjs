import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// menu.ts est du TypeScript de l'app : on le compile à la volée (esbuild est déjà là, avec Vite).
const out = await build({ entryPoints: ['src/features/uac/lib/menu.ts'], bundle: true, format: 'esm', write: false });
const { todayKey, currentMeal, parseSchedule } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

// 2026-10-29 est un jeudi.
test('le jour et le repas se calculent à l’heure du Bénin (UTC+1), pas celle du téléphone', () => {
    assert.equal(todayKey(Date.UTC(2026, 9, 29, 12, 0)), 'jeudi');
    assert.equal(todayKey(Date.UTC(2026, 9, 29, 23, 30)), 'vendredi'); // minuit passé à Cotonou
    assert.equal(currentMeal(Date.UTC(2026, 9, 29, 6, 0)), 'matin');   // 7 h
    assert.equal(currentMeal(Date.UTC(2026, 9, 29, 11, 0)), 'midi');   // 12 h
    assert.equal(currentMeal(Date.UTC(2026, 9, 29, 17, 0)), 'soir');   // 18 h
});

test('un menu illisible donne un menu vide', () => {
    assert.equal(parseSchedule('pas du json').lundi.midi, '');
    assert.equal(parseSchedule('{"jeudi":{"soir":"Riz"}}').jeudi.soir, 'Riz');
});

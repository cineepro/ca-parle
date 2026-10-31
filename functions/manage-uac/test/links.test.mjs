import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const out = await build({ entryPoints: ['src/features/uac/lib/links.ts'], bundle: true, format: 'esm', write: false });
const { parseLinkList, guessKind } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

test('la liste « nom puis lien » est lue, avec lignes vides, coordonnées ou nom et lien sur une ligne', () => {
    const items = parseLinkList(`Idriss deby ino
https://goo.gl/maps/aaa

Amphi C-1000
https://goo.gl/maps/bbb
Ifri
https://goo.gl/maps/ccc
Amphi A-400
https://goo.gl/maps/ddd

Rectorat : https://goo.gl/maps/eee
Resto U
6.4123, 2.3345`);
    assert.deepEqual(items.map((i) => i.name), ['Idriss deby ino', 'Amphi C-1000', 'Ifri', 'Amphi A-400', 'Rectorat', 'Resto U']);
    assert.equal(items[4].url, 'https://goo.gl/maps/eee');
    assert.deepEqual([items[5].latitude, items[5].longitude], [6.4123, 2.3345]);
    assert.equal(new Set(items.map((i) => i.key)).size, 6);
});

test('un nom sans lien est ignoré, le type est deviné', () => {
    assert.equal(parseLinkList('Nom seul\nAutre nom').length, 0);
    assert.equal(guessKind('Amphi A-500'), 'amphi');
    assert.equal(guessKind('Resto BID'), 'restauration');
    assert.equal(guessKind('Centre commercial epac'), 'commerce');
    assert.equal(guessKind('Rectorat'), 'administration');
    assert.equal(guessKind('Dacanat Fast'), 'administration');
    assert.equal(guessKind('Jardin botanique'), 'autre');
    assert.equal(guessKind('Ilaci'), 'amphi');
});

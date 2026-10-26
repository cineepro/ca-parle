import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAvatarFile, avatarViewUrl, fileIdFromUrl, ownsFile } from '../src/logic.js';

const file = (over = {}) => ({ $permissions: ['read("any")', 'delete("user:u1")', 'update("user:u1")'], mimeType: 'image/webp', sizeOriginal: 50000, ...over });

test('photo valide', () => assert.equal(checkAvatarFile(file(), 'u1'), null));
test('fichier d’un autre', () => assert.match(checkAvatarFile(file(), 'u2'), /pas à toi/));
test('mauvais format', () => assert.match(checkAvatarFile(file({ mimeType: 'application/pdf' }), 'u1'), /Format/));
test('trop lourd', () => assert.match(checkAvatarFile(file({ sizeOriginal: 3e6 }), 'u1'), /lourde/));
test('absent', () => assert.match(checkAvatarFile(null, 'u1'), /introuvable/));
test('permissions vides', () => assert.equal(ownsFile({}, 'u1'), false));
test('aller-retour adresse', () => {
    const url = avatarViewUrl('https://x.io/v1/', 'bk', 'f123', 'p1');
    assert.equal(url, 'https://x.io/v1/storage/buckets/bk/files/f123/view?project=p1');
    assert.equal(fileIdFromUrl(url, 'bk'), 'f123');
    assert.equal(fileIdFromUrl('', 'bk'), null);
});

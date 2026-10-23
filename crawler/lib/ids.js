// crawler/lib/ids.js — Zem
import { createHash } from 'node:crypto';
// Un identifiant stable par adresse : revenir sur la même page met à jour la même fiche
// (jamais de doublon). 32 caractères hexadécimaux = accepté par Appwrite.
export const docIdForUrl = (url) => createHash('sha1').update(url).digest('hex').slice(0, 32);
export const hashContent = (text) => createHash('sha1').update(text).digest('hex');

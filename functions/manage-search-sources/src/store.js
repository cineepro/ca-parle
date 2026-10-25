// functions/manage-search-sources/src/store.js — Zem
// Petits outils partagés d'accès à l'index.
import { createHash } from 'node:crypto';
import { Query } from 'node-appwrite';

export const sha1 = (s) => createHash('sha1').update(String(s)).digest('hex');
// Identifiant stable (32 caractères hexadécimaux) : revenir sur la même note met à jour la même fiche.
export const stableId = (kind, key) => sha1(`${kind}:${key}`).slice(0, 32);

// Supprime les pages d'un site (ou d'un connecteur) par lots. Renvoie le nombre restant.
export async function purgeBySource(databases, DB, DOCS, sourceId, { batch = 100, max = 500 } = {}) {
    let removed = 0;
    while (removed < max) {
        const r = await databases.listDocuments(DB, DOCS, [Query.equal('sourceId', sourceId), Query.limit(batch), Query.select(['$id'])]);
        if (!r.documents.length) break;
        await Promise.all(r.documents.map((d) => databases.deleteDocument(DB, DOCS, d.$id).catch(() => {})));
        removed += r.documents.length;
    }
    const left = await databases.listDocuments(DB, DOCS, [Query.equal('sourceId', sourceId), Query.limit(1), Query.select(['$id'])]);
    return { removed, remaining: left.total };
}

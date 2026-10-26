// functions/manage-profile/src/logic.js — Vanessa
// Règles pures (testables sans Appwrite).

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/** Adresse publique d'un fichier d'avatar. */
export function avatarViewUrl(endpoint, bucketId, fileId, projectId) {
    const base = String(endpoint).replace(/\/+$/, '');
    return `${base}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
}

/** Le fichier appartient-il à cet utilisateur ? (il en a le droit de suppression) */
export function ownsFile(file, userId) {
    const perms = Array.isArray(file?.$permissions) ? file.$permissions : [];
    return perms.some((p) => p === `delete("user:${userId}")`);
}

/** Vérifie un fichier envoyé comme photo. Renvoie un message d'erreur, ou null si tout va bien. */
export function checkAvatarFile(file, userId) {
    if (!file) return 'Fichier introuvable.';
    if (!ownsFile(file, userId)) return "Ce fichier n'est pas à toi.";
    if (!ALLOWED_MIME.includes(file.mimeType)) return 'Format non accepté (JPG, PNG ou WebP).';
    if ((file.sizeOriginal ?? 0) > MAX_AVATAR_BYTES) return 'Image trop lourde (2 Mo maximum).';
    return null;
}

/** Extrait l'identifiant du fichier d'une adresse d'avatar construite par avatarViewUrl. */
export function fileIdFromUrl(url, bucketId) {
    const m = String(url || '').match(new RegExp(`/buckets/${bucketId}/files/([^/]+)/view`));
    return m ? m[1] : null;
}

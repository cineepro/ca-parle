// functions/sync-connector-sources/src/dedupe.js — Vanessa
// Évite de recréer une information déjà présente dans la base de connaissances (une même actualité résumée
// plusieurs fois, avec des mots un peu différents) et écarte les résumés inutilisables.
// ⚠️ La logique de ressemblance est la même que dans scripts/qdrant/find-duplicates.mjs et
// functions/send-message/src/qdrantSearch.js : garder le même seuil partout.

export const NEAR_DUPLICATE_THRESHOLD = 0.55; // ressemblance (0 à 1) à partir de laquelle deux notes sont des doublons

const STOP = new Set('dans pour avec sont cette plus comme tout tous toute toutes leur leurs entre aussi sous elle elles mais fait ainsi etre'.split(' '));

/** Mots significatifs d'un texte (sans accents, au moins 4 caractères, sans mots vides). */
export function tokensOf(text) {
    const normalized = String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return new Set(normalized.split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)));
}

/** Ressemblance entre deux ensembles de mots : 1 = identiques, 0 = rien en commun. */
export function similarity(a, b) {
    if (a.size === 0 || b.size === 0) return 0;
    let common = 0;
    for (const w of a) if (b.has(w)) common += 1;
    return common / (a.size + b.size - common);
}

/** Un résumé raté de l'IA (refus, code collé) ne doit jamais devenir une note. */
export function looksLikeFailedSummary(text) {
    const t = String(text || '').trim();
    return /^(je ne peux pas|je n'ai pas pu|je suis désolé|désolé|impossible de)/i.test(t) || /base64|<!doctype|<html/i.test(t);
}

/** Retire l'en-tête « Résumé » (titre markdown ou texte en gras) que le modèle ajoute parfois. */
export function cleanSummary(text) {
    return String(text || '').replace(/^\s*(#+\s*)?(\*\*)?r[ée]sum[ée]\s*:?\s*(\*\*)?\s*/i, '').trim();
}
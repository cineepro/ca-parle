// src/config/features.ts — Vanessa
// Interrupteurs d'affichage. Mettre `true` pour réafficher une fonction :
// rien n'est supprimé, le code et les Functions restent en place.
// (Raison actuelle : le mode appel et les vocaux consomment beaucoup de
// crédit Claude/ElevenLabs ; on garde la messagerie écrite + images.)

/** Bouton micro (note vocale) dans la messagerie. */
export const VOICE_MESSAGES_ENABLED = false;

/** Bouton "discuter en direct" (mode appel) avec Vanessa. */
export const LIVE_CALL_ENABLED = false;

/** Lien "Émissions" dans la barre latérale (réservé aux modérateurs).
 *  La page /emissions reste accessible directement par son adresse. */
export const EMISSIONS_ENABLED = false;
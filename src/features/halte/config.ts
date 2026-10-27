// src/features/halte/config.ts — HALTE
// Numéros affichés sur la page publique. ⚠️ À VÉRIFIER AVANT TOUTE IMPRESSION : appelle chaque numéro, note
// la date de vérification ci-dessous. (La ligne 138 a déjà connu une panne en 2023 ; un numéro de repli
// payant avait alors été communiqué : ne jamais imprimer un numéro non vérifié.)
export interface HalteNumber { label: string; number: string; detail: string }

export const EMERGENCY_NUMBERS: HalteNumber[] = [
    { label: 'Ligne d’assistance aux enfants', number: '138', detail: 'Gratuit, jour et nuit. On t’écoute et on t’oriente.' },
    { label: 'Police secours', number: '117', detail: 'Si tu es en danger tout de suite.' },
];
export const NUMBERS_VERIFIED_ON = ''; // ex. '2026-11-10' une fois les numéros testés

/** Contacts de proximité (Guichet unique de protection sociale, CPS…) : JSON dans VITE_HALTE_LOCAL_CONTACTS. */
export function localContacts(): HalteNumber[] {
    try {
        const raw = import.meta.env.VITE_HALTE_LOCAL_CONTACTS;
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.filter((x) => x && x.label && x.number).map((x) => ({ label: String(x.label), number: String(x.number), detail: String(x.detail || '') })) : [];
    } catch {
        return [];
    }
}

/** Numéro qui reçoit les SMS d'alerte (passerelle SMS). Vide = le QR « SMS » n'est pas proposé. */
export const SMS_NUMBER = (import.meta.env.VITE_HALTE_SMS_NUMBER || '').replace(/[^\d+]/g, '');
/** Adresse publique imprimée dans les QR codes (le domaine FINAL, pas un domaine de test). */
export const publicBaseUrl = () => (import.meta.env.VITE_HALTE_PUBLIC_URL || window.location.origin).replace(/\/+$/, '');
/** Page neutre où le bouton « Quitter vite » emmène. */
export const EXIT_URL = import.meta.env.VITE_HALTE_EXIT_URL || 'https://www.google.com/search?q=m%C3%A9t%C3%A9o+Cotonou';

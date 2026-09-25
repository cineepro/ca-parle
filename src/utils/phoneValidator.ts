// src/utils/phoneValidator.ts — Vanessa
// Le téléphone est OPTIONNEL partout (voir décision produit). Ce validateur
// sert uniquement à éviter de stocker n'importe quoi quand l'utilisateur
// choisit de le renseigner.

const DEFAULT_COUNTRY_CODE = '+229'; // Bénin

/**
 * Normalise un numéro saisi par l'utilisateur en format international.
 * - Si l'utilisateur a déjà mis un indicatif (+xxx), on le garde tel quel.
 * - Sinon, on préfixe avec l'indicatif Bénin par défaut.
 * Retourne null si le numéro est vide ou manifestement invalide.
 */
export function normalizePhone(raw: string): string | null {
    if (!raw || !raw.trim()) return null;

    const cleaned = raw.trim().replace(/[\s().-]/g, '');

    if (cleaned.startsWith('+')) {
        return isValidPhone(cleaned) ? cleaned : null;
    }

    // Numéro local sans indicatif → on ajoute le défaut Bénin
    const withCountryCode = `${DEFAULT_COUNTRY_CODE}${cleaned.replace(/^0+/, '')}`;
    return isValidPhone(withCountryCode) ? withCountryCode : null;
}

/**
 * Validation basique format E.164 : + suivi de 8 à 15 chiffres.
 */
export function isValidPhone(phone: string): boolean {
    return /^\+[1-9]\d{7,14}$/.test(phone);
}

// src/config/countries.ts — Vanessa
export interface Country {
    slug: string;
    name: string;
    flag: string;
}

export const COUNTRIES: Country[] = [
    { slug: 'tous', name: 'Tous les pays', flag: '🌍' },
    { slug: 'benin', name: 'Bénin', flag: '🇧🇯' },
    { slug: 'cote-ivoire', name: "Côte d'Ivoire", flag: '🇨🇮' },
    { slug: 'cameroun', name: 'Cameroun', flag: '🇨🇲' },
    { slug: 'togo', name: 'Togo', flag: '🇹🇬' },
    { slug: 'senegal', name: 'Sénégal', flag: '🇸🇳' },
    { slug: 'autre', name: 'Autre / International', flag: '🌐' },
];

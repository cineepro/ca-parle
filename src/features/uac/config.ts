// src/features/uac/config.ts — Vanessa
export type NewsKind = 'concours' | 'location' | 'emploi' | 'soutenance' | 'excursion' | 'autre';

export const NEWS_KINDS: { slug: NewsKind; name: string; icon: string }[] = [
    { slug: 'concours', name: 'Concours', icon: '🎓' },
    { slug: 'location', name: 'Location', icon: '🏠' },
    { slug: 'emploi', name: 'Emploi', icon: '💼' },
    { slug: 'soutenance', name: 'Soutenance', icon: '📜' },
    { slug: 'excursion', name: 'Excursion', icon: '🚌' },
    { slug: 'autre', name: 'Autre', icon: '📢' },
];

export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
export type Day = (typeof DAYS)[number];
export const MEALS = [
    { slug: 'matin', label: 'Petit-déjeuner', short: 'Matin', icon: '🌅' },
    { slug: 'midi', label: 'Déjeuner', short: 'Midi', icon: '☀️' },
    { slug: 'soir', label: 'Dîner', short: 'Soir', icon: '🌙' },
] as const;
export type MealSlug = (typeof MEALS)[number]['slug'];

export type WeekMenu = Record<Day, Record<MealSlug, string>>;

export type PlaceKind = 'amphi' | 'administration' | 'banque' | 'commerce' | 'restauration' | 'sante' | 'bibliotheque' | 'sport' | 'transport' | 'autre';

export const PLACE_KINDS: { slug: PlaceKind; name: string; icon: string }[] = [
    { slug: 'amphi', name: 'Amphis & facultés', icon: '🎓' },
    { slug: 'administration', name: 'Administration', icon: '🏛️' },
    { slug: 'banque', name: 'Banques', icon: '🏦' },
    { slug: 'commerce', name: 'Commerces', icon: '🛍️' },
    { slug: 'restauration', name: 'Restauration', icon: '🍽️' },
    { slug: 'sante', name: 'Santé', icon: '⚕️' },
    { slug: 'bibliotheque', name: 'Bibliothèques', icon: '📚' },
    { slug: 'sport', name: 'Sport', icon: '⚽' },
    { slug: 'transport', name: 'Transport', icon: '🚌' },
    { slug: 'autre', name: 'Autres', icon: '📍' },
];

// Centre approximatif du campus d'Abomey-Calavi — à AJUSTER si besoin (c'est juste le point où la carte s'ouvre).
export const CAMPUS_CENTER: [number, number] = [2.3405, 6.4145]; // [longitude, latitude]
export const CAMPUS_ZOOM = 14.5;

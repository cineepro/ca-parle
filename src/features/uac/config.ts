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

// src/config/categories.ts — Ça Parle
export interface Category {
    slug: string;
    name: string;
    icon: string;
}

// Doit correspondre aux documents de la collection `categories` en base.
// Cette liste sert de repli/valeurs par défaut côté front.
export const CATEGORIES: Category[] = [
    { slug: 'tout', name: 'Tout', icon: '🌍' },
    { slug: 'benin', name: 'Bénin', icon: '🇧🇯' },
    { slug: 'people', name: 'People', icon: '⭐' },
    { slug: 'influenceurs', name: 'Influenceurs', icon: '📱' },
    { slug: 'football', name: 'Football', icon: '⚽' },
    { slug: 'musique', name: 'Musique', icon: '🎵' },
    { slug: 'cinema', name: 'Cinéma', icon: '🎬' },
    { slug: 'couples', name: 'Couples', icon: '💔' },
    { slug: 'entreprises', name: 'Entreprises', icon: '🏢' },
    { slug: 'insolite', name: 'Insolite', icon: '😲' },
];
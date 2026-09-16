// src/features/caSert/config/categories.ts — Ça Parle
export interface SpotCategory {
    slug: string;
    label: string;
    icon: string;
}

export const SPOT_CATEGORIES: SpotCategory[] = [
    { slug: 'tout', label: 'Tout', icon: '🧰' },
    { slug: 'manger', label: 'Manger', icon: '🍲' },
    { slug: 'services', label: 'Services', icon: '🔧' },
    { slug: 'shopping', label: 'Shopping', icon: '🛍️' },
    { slug: 'sante', label: 'Santé', icon: '💊' },
    { slug: 'autre', label: 'Autre', icon: '📍' },
];
// src/features/moteur/lib/phrases.ts — Zem
// Tous les textes « locaux » de Zem au même endroit, pour les relire et les corriger d'un coup.
// ⚠️ Ces expressions sont des PROPOSITIONS : à faire valider par des Béninois (Cotonou, Parakou,
// Porto-Novo…) avant la mise en ligne — une tournure juste à Cotonou peut sonner faux ailleurs.
import type { ZemCategory } from '../services/moteurService';

export const ZEM_TAGLINE = 'Zem, il t’amène partout.';
export const ZEM_SUBTITLE = 'Dis-lui où tu veux aller : actualités, études, papiers, boulot, marché…';

export const PLACEHOLDERS = [
    'Inscription à l’UAC',
    'Bourse d’études au Bénin',
    'Comment faire mon acte de naissance',
    'Concours de recrutement',
    'Prix du maïs au marché',
    'Résultats du BAC',
];

export const WAITING_LINES = [
    'Zem est en route…',
    'Zem cherche le bon chemin…',
    'Ça roule, ça arrive…',
    'Zem fonce, tiens bon…',
];

export const ARRIVED = 'Zem est arrivé !';
export const NOTHING_FOUND_TITLE = 'Zem a roulé partout, il n’a rien trouvé.';
export const NOTHING_FOUND_HELP = 'Essaie un autre mot, ou demande directement à Vanessa.';
export const ERROR_LINE = 'Zem est tombé en panne un instant. Réessaie.';
export const HOME_EMPTY = 'Zem n’a encore visité aucun site. Reviens bientôt !';
export const LATEST_TITLE = 'Les dernières nouvelles du coin';
export const RUBRICS_TITLE = 'Où veux-tu aller ?';
export const ASK_VANESSA = 'Pas trouvé ? Demande à Vanessa';
export const READ_HERE = 'Lire ici';
export const OPEN_SITE = 'Aller sur le site';

export const CATEGORY_META: Record<ZemCategory, { label: string; emoji: string }> = {
    actualites: { label: 'Les nouvelles', emoji: '📰' },
    etudes: { label: 'À l’école', emoji: '🎓' },
    administration: { label: 'Les papiers', emoji: '📄' },
    sante: { label: 'Santé', emoji: '🩺' },
    emploi: { label: 'Boulot', emoji: '💼' },
    marche: { label: 'Marché', emoji: '🧺' },
    culture: { label: 'Culture', emoji: '🎭' },
    sport: { label: 'Sport', emoji: '⚽' },
    services: { label: 'Utile', emoji: '🧭' },
    autre: { label: 'Autres', emoji: '✨' },
};
export const CATEGORY_ORDER = Object.keys(CATEGORY_META) as ZemCategory[];

export const TRUST_META: Record<1 | 2 | 3, { label: string; className: string }> = {
    3: { label: 'Officiel ✔', className: 'bg-green-50 text-green-700' },
    2: { label: 'Fiable', className: 'bg-sand text-ochre' },
    1: { label: 'À vérifier', className: 'bg-gray-100 text-gray-500' },
};

export function freshnessLabel(iso: string, now = Date.now()): string {
    const t = Date.parse(iso);
    if (!iso || Number.isNaN(t)) return '';
    const days = Math.floor((now - t) / 86400000);
    if (days < 0) return '';
    if (days === 0) return 'Aujourd’hui';
    if (days === 1) return 'Hier';
    if (days < 30) return `Il y a ${days} jours`;
    if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
    return new Date(t).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

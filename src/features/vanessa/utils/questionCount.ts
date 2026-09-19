// src/features/vanessa/utils/questionCount.ts — Ça Parle
import type { VanessaConnector } from '../services/vanessaKnowledgeService';

export const MONTH_LABELS = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

// "AAAA-MM" du mois en cours, ex. "2026-09" — même format que celui écrit
// côté backend (send-message) pour le compteur.
export function currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 1 → "1" · 100 → "100" · 1000 → "1K" · 1500 → "1.5K"
export function formatQuestionCount(n: number): string {
    if (n < 1000) return String(n);
    const thousands = n / 1000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
}

// Le compteur stocké peut appartenir à un mois déjà terminé (il n'est remis
// à zéro qu'à la PROCHAINE question posée, pas par une tâche planifiée) —
// on ne l'affiche donc que s'il correspond bien au mois en cours, sinon on
// affiche 0 : le mois vient de commencer, aucune question n'y a encore été
// posée.
export function monthlyQuestionCount(c: Pick<VanessaConnector, 'questionCount' | 'questionCountMonth'>): number {
    if (c.questionCountMonth !== currentMonthKey()) return 0;
    return c.questionCount || 0;
}
// src/features/reputation/badgeCatalog.ts — Vanessa
// ⚠️ Ce fichier n'est plus importé par le code applicatif : la logique
// d'attribution vit désormais dans les Functions serveur
// (`on-story-created`, `on-comment-created`, `resolve-prediction`), qui
// dupliquent volontairement `meetsCriteria()` et `computeGossipLevel()`
// (les Functions Appwrite ne peuvent pas importer du code depuis `src/`).
// Ce fichier reste la DOCUMENTATION DE RÉFÉRENCE : si tu changes un seuil
// ici, réplique le changement dans les 3 Functions ET dans
// `scripts/seedBadges.mjs`.
export interface BadgeDefinition {
    key: string;
    name: string;
    description: string;
    icon: string;
    criteria: string;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
    {
        key: 'lanceur_affaire',
        name: "Lanceur d'affaire",
        description: 'A publié sa première histoire',
        icon: '💥',
        criteria: 'storiesCount >= 1',
    },
    {
        key: 'roi_du_ragot',
        name: 'Roi du ragot',
        description: 'A publié 20 histoires',
        icon: '🔥',
        criteria: 'storiesCount >= 20',
    },
    {
        key: 'detective',
        name: 'Détective',
        description: 'A publié 5 révélations',
        icon: '🏆',
        criteria: 'revelationsCount >= 5',
    },
    {
        key: 'commentateur',
        name: 'Commentateur',
        description: 'A publié 10 commentaires',
        icon: '😂',
        criteria: 'commentsCount >= 10',
    },
    {
        key: 'toujours_au_courant',
        name: 'Toujours au courant',
        description: 'A publié 50 commentaires',
        icon: '👀',
        criteria: 'commentsCount >= 50',
    },
    {
        key: 'source_fiable',
        name: 'Source fiable',
        description: 'Indice de fiabilité ≥ 80% sur au moins 5 prédictions',
        icon: '🔎',
        criteria: 'reliabilityIndex >= 80 && predictionsTotal >= 5',
    },
];

// Seuils de niveau de commérage, basés sur reputationScore.
export const GOSSIP_LEVEL_THRESHOLDS = [0, 50, 150, 300, 600, 1000, 2000];

export function computeGossipLevel(reputationScore: number): number {
    let level = 1;
    for (const threshold of GOSSIP_LEVEL_THRESHOLDS) {
        if (reputationScore >= threshold) level++;
        else break;
    }
    return Math.min(level, GOSSIP_LEVEL_THRESHOLDS.length);
}

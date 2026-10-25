// src/features/moteur/lib/mosaic.ts — Zem
// Plan de la « mosaïque » : au lieu d'une liste, les résultats s'enchaînent en blocs de formes
// différentes, comme dans un album. Un cycle = 1 grande carte, 2 cartes côte à côte, 1 carte large,
// puis 3 lignes compactes (7 résultats). Le plan ne dépend que de la POSITION : « Voir plus » ajoute
// des blocs à la suite sans bouger ce qui est déjà affiché.
export type BlockKind = 'hero' | 'pair' | 'wide' | 'rows';
export interface Block { kind: BlockKind; from: number; count: number }

const CYCLE: { kind: BlockKind; size: number }[] = [
    { kind: 'hero', size: 1 },
    { kind: 'pair', size: 2 },
    { kind: 'wide', size: 1 },
    { kind: 'rows', size: 3 },
];

export function planMosaic(n: number): Block[] {
    const blocks: Block[] = [];
    let i = 0;
    while (i < n) {
        for (const step of CYCLE) {
            if (i >= n) break;
            const count = Math.min(step.size, n - i);
            // Une carte « côte à côte » toute seule devient une carte large (pas de trou).
            const kind: BlockKind = step.kind === 'pair' && count === 1 ? 'wide' : step.kind;
            blocks.push({ kind, from: i, count });
            i += count;
        }
    }
    return blocks;
}

// src/features/moteur/components/ZemMosaic.tsx — Zem
// Dispose les résultats en mosaïque (voir lib/mosaic.ts) au lieu d'une simple liste.
import type { ZemResult } from '../services/moteurService';
import { planMosaic } from '../lib/mosaic';
import { ZemTile } from './ZemTile';

export const ZemMosaic = ({ results, words = [], onRead }: { results: ZemResult[]; words?: string[]; onRead: (r: ZemResult) => void }) => (
    <div className="grid grid-cols-2 gap-3">
        {planMosaic(results.length).map((b) => {
            const items = results.slice(b.from, b.from + b.count);
            if (b.kind === 'rows') {
                return (
                    <div key={b.from} className="col-span-2 rounded-2xl bg-white border border-gray-100 divide-y divide-gray-100">
                        {items.map((r) => <ZemTile key={r.id} result={r} variant="row" words={words} onRead={onRead} />)}
                    </div>
                );
            }
            const variant = b.kind === 'pair' ? 'half' : b.kind;
            return items.map((r) => <ZemTile key={r.id} result={r} variant={variant} words={words} onRead={onRead} />);
        })}
    </div>
);

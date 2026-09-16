// src/features/caSert/components/PriceTicker.tsx — Ça Parle --
import type { MarketPrice } from '../services/caSertService';

interface Props {
    prices: MarketPrice[];
}

// En dessous de ce seuil, le défilement en boucle n'a pas assez de contenu
// différent pour paraître naturel — le point de jonction devient visible et
// ressemble à un bug plutôt qu'à un vrai ticker. On affiche alors une
// simple rangée statique, sans animation.
const MIN_ITEMS_FOR_LOOP = 4;

export const PriceTicker = ({ prices }: Props) => {
    if (prices.length === 0) return null;

    const shouldLoop = prices.length >= MIN_ITEMS_FOR_LOOP;
    // Dupliqué une fois pour un défilement en boucle continue, sans saut
    // visible au moment où la liste recommence — pertinent seulement s'il
    // y a assez d'éléments pour que la jonction ne saute pas aux yeux.
    const items = shouldLoop ? [...prices, ...prices] : prices;

    const renderItem = (p: MarketPrice, i: number) => (
        <span key={`${p.$id}-${i}`} className="text-xs text-gray-600 flex items-center gap-1.5 px-2 shrink-0">
            <span className="font-semibold text-gray-800">{p.item}</span>
            <span className="text-[#FF4757] font-bold">
                {p.price.toLocaleString('fr-FR')} F{p.unit ? `/${p.unit}` : ''}
            </span>
            {p.quartier && <span className="text-gray-400">· {p.quartier}</span>}
        </span>
    );

    if (!shouldLoop) {
        // Rangée statique, simplement défilable au doigt/à la souris si
        // ça déborde — pas d'animation tant qu'il n'y a pas assez d'infos.
        return (
            <div className="overflow-x-auto rounded-2xl bg-white border border-gray-100 py-2.5">
                <div className="flex gap-6 whitespace-nowrap px-3" style={{ width: 'max-content' }}>
                    {items.map(renderItem)}
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl bg-white border border-gray-100 py-2.5">
            <div className="flex gap-8 whitespace-nowrap animate-[ticker_30s_linear_infinite]" style={{ width: 'max-content' }}>
                {items.map(renderItem)}
            </div>
            <style>{`
                @keyframes ticker {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
};  
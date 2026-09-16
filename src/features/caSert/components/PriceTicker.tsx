// src/features/caSert/components/PriceTicker.tsx — Ça Parle
import type { MarketPrice } from '../services/caSertService';

interface Props {
    prices: MarketPrice[];
}

export const PriceTicker = ({ prices }: Props) => {
    if (prices.length === 0) return null;

    // Dupliqué une fois pour un défilement en boucle continue, sans saut
    // visible au moment où la liste recommence.
    const items = [...prices, ...prices];

    return (
        <div className="overflow-hidden rounded-2xl bg-white border border-gray-100 py-2.5">
            <div className="flex gap-8 whitespace-nowrap animate-[ticker_30s_linear_infinite]" style={{ width: 'max-content' }}>
                {items.map((p, i) => (
                    <span key={`${p.$id}-${i}`} className="text-xs text-gray-600 flex items-center gap-1.5 px-2">
                        <span className="font-semibold text-gray-800">{p.item}</span>
                        <span className="text-[#FF4757] font-bold">
                            {p.price.toLocaleString('fr-FR')} F{p.unit ? `/${p.unit}` : ''}
                        </span>
                        {p.quartier && <span className="text-gray-400">· {p.quartier}</span>}
                    </span>
                ))}
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
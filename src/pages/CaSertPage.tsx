// src/pages/CaSertPage.tsx — Ça Parle
import { useState, useEffect, useCallback } from 'react';
import { caSertService, type Spot, type MarketPrice } from '@/features/caSert/services/caSertService';
import { SpotCard } from '@/features/caSert/components/SpotCard';
import { PriceTicker } from '@/features/caSert/components/PriceTicker';
import { AddContributionModal } from '@/features/caSert/components/AddContributionModal';
import { SPOT_CATEGORIES } from '@/features/caSert/config/categories';
import { CountryFilter } from '@/features/stories/components/CountryFilter';

export default function CaSertPage() {
    const [spots, setSpots] = useState<Spot[]>([]);
    const [prices, setPrices] = useState<MarketPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('tout');
    const [country, setCountry] = useState('tous');
    const [showAddModal, setShowAddModal] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [spotList, priceList] = await Promise.all([
                caSertService.listSpots(category, country),
                caSertService.listPrices(country),
            ]);
            setSpots(spotList);
            setPrices(priceList);
        } finally {
            setLoading(false);
        }
    }, [category, country]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">🧰 Ça sert</h1>
                    <p className="text-xs text-gray-400">Les vrais plans, par la communauté</p>
                </div>
                <CountryFilter selected={country} onSelect={setCountry} />
            </div>

            <PriceTicker prices={prices} />

            <div className="flex gap-2 overflow-x-auto pb-1">
                {SPOT_CATEGORIES.map((c) => (
                    <button
                        key={c.slug}
                        onClick={() => setCategory(c.slug)}
                        className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                            category === c.slug ? 'bg-[#FF4757] text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        <span>{c.icon}</span>
                        {c.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 text-center py-10">Chargement...</p>
            ) : spots.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-2">
                    <div className="text-3xl">🧰</div>
                    <p className="text-sm text-gray-500">Rien par ici pour l'instant. Sois le premier à balancer un bon plan !</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {spots.map((spot) => (
                        <SpotCard key={spot.$id} spot={spot} />
                    ))}
                </div>
            )}

            <button
                onClick={() => setShowAddModal(true)}
                className="fixed bottom-24 md:bottom-8 right-4 md:right-8 flex items-center gap-2 bg-[#FF4757] text-white font-semibold text-sm px-4 py-3 rounded-full shadow-lg hover:bg-[#e63e4d] transition-colors z-30"
            >
                ➕ Balance ton bon plan
            </button>

            {showAddModal && (
                <AddContributionModal
                    onClose={() => setShowAddModal(false)}
                    onDone={() => { setShowAddModal(false); load(); }}
                />
            )}
        </div>
    );
}
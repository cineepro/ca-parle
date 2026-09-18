// src/pages/CaSertPage.tsx — Ça Parle
import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { caSertService, type Spot, type MarketPrice } from '@/features/caSert/services/caSertService';
import { SpotCard } from '@/features/caSert/components/SpotCard';
import { PriceTicker } from '@/features/caSert/components/PriceTicker';
import { AddContributionModal } from '@/features/caSert/components/AddContributionModal';
import { SPOT_CATEGORIES } from '@/features/caSert/config/categories';
import { CountryFilter } from '@/features/stories/components/CountryFilter';

// Chargé seulement à l'ouverture de Ça sert — MapLibre pèse ~1 Mo, inutile
// de l'imposer sur chaque page de l'app pour les utilisateurs qui n'ouvrent
// jamais cette section.
const CaSertMapView = lazy(() => import('@/features/caSert/components/CaSertMapView').then((m) => ({ default: m.CaSertMapView })));

type ViewMode = 'carte' | 'liste';

export default function CaSertPage() {
    const [spots, setSpots] = useState<Spot[]>([]);
    const [prices, setPrices] = useState<MarketPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('tout');
    const [country, setCountry] = useState('tous');
    const [showAddModal, setShowAddModal] = useState(false);
    // Carte par défaut — c'est elle qui doit surprendre en premier.
    const [viewMode, setViewMode] = useState<ViewMode>('carte');

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
                    <Link to="/ca-sert/mes-contributions" className="text-xs text-[#FF4757] font-semibold hover:underline">
                        Mes contributions →
                    </Link>
                </div>
                <CountryFilter selected={country} onSelect={setCountry} />
            </div>

            <PriceTicker prices={prices} />

            <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
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

                {/* Bascule carte/liste — carte par défaut à l'ouverture. */}
                <div className="shrink-0 flex bg-gray-100 rounded-full p-1">
                    <button
                        onClick={() => setViewMode('carte')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            viewMode === 'carte' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'
                        }`}
                    >
                        🗺️ Carte
                    </button>
                    <button
                        onClick={() => setViewMode('liste')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            viewMode === 'liste' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'
                        }`}
                    >
                        📋 Liste
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 text-center py-10">Chargement...</p>
            ) : spots.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-2">
                    <div className="text-3xl">🧰</div>
                    <p className="text-sm text-gray-500">Rien par ici pour l'instant. Sois le premier à balancer un bon plan !</p>
                </div>
            ) : viewMode === 'carte' ? (
                <Suspense fallback={<p className="text-sm text-gray-400 text-center py-10">Chargement de la carte...</p>}>
                    <CaSertMapView spots={spots} />
                </Suspense>
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
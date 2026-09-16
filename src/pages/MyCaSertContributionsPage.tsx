// src/pages/MyCaSertContributionsPage.tsx — Ça Parle
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { caSertService, type Spot, type MarketPrice } from '@/features/caSert/services/caSertService';
import { SPOT_CATEGORIES } from '@/features/caSert/config/categories';
import { useAuth } from '@/features/auth/hooks/useAuth';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    attente: { label: '⏳ En attente de validation', color: 'text-amber-600 bg-amber-50' },
    visible: { label: '✅ Publié', color: 'text-green-600 bg-green-50' },
    refuse: { label: '❌ Refusé', color: 'text-red-500 bg-red-50' },
};

export default function MyCaSertContributionsPage() {
    const { user } = useAuth();
    const [spots, setSpots] = useState<Spot[]>([]);
    const [prices, setPrices] = useState<MarketPrice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        caSertService.listMyContributions(user.$id)
            .then(({ spots, prices }) => { setSpots(spots); setPrices(prices); })
            .finally(() => setLoading(false));
    }, [user]);

    const total = spots.length + prices.length;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            <div className="flex items-center gap-3">
                <Link to="/ca-sert" className="text-gray-400 hover:text-gray-600">←</Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Mes contributions</h1>
                    <p className="text-xs text-gray-400">Suis l'évolution de ce que tu as balancé sur Ça sert</p>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 text-center py-10">Chargement...</p>
            ) : total === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-2">
                    <div className="text-3xl">🧰</div>
                    <p className="text-sm text-gray-500">Tu n'as encore rien proposé.</p>
                    <Link to="/ca-sert" className="text-sm text-[#FF4757] font-semibold hover:underline">Balance ton premier bon plan</Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {spots.map((spot) => {
                        const status = STATUS_LABEL[spot.moderationStatus];
                        const category = SPOT_CATEGORIES.find((c) => c.slug === spot.category);
                        return (
                            <div key={spot.$id} className="bg-white rounded-2xl border border-gray-100 p-4">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-gray-400">{category?.icon} Lieu/service</span>
                                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${status.color}`}>{status.label}</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-800">{spot.name}</p>
                                {spot.moderationStatus === 'visible' && (
                                    <p className="text-xs text-gray-400 mt-1">✅ {spot.confirmCount} confirmation{spot.confirmCount > 1 ? 's' : ''}</p>
                                )}
                            </div>
                        );
                    })}

                    {prices.map((price) => {
                        const status = STATUS_LABEL[price.moderationStatus];
                        return (
                            <div key={price.$id} className="bg-white rounded-2xl border border-gray-100 p-4">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-gray-400">💰 Prix</span>
                                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${status.color}`}>{status.label}</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-800">
                                    {price.item} — {price.price.toLocaleString('fr-FR')} F{price.unit ? `/${price.unit}` : ''}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
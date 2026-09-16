// src/features/caSert/components/CaSertModerationQueue.tsx — Ça Parle
import { useState, useEffect, useCallback } from 'react';
import { moderateCaSertService } from '../services/moderateCaSertService';
import type { Spot, MarketPrice } from '../services/caSertService';
import { SPOT_CATEGORIES } from '../config/categories';
import { Button } from '@/components/ui/button';

export const CaSertModerationQueue = () => {
    const [spots, setSpots] = useState<Spot[]>([]);
    const [prices, setPrices] = useState<MarketPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await moderateCaSertService.listPending();
            setSpots(result.spots);
            setPrices(result.prices);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleApprove = async (type: 'spot' | 'price', id: string) => {
        setProcessingId(id);
        try {
            await moderateCaSertService.approve(type, id);
            if (type === 'spot') setSpots((prev) => prev.filter((s) => s.$id !== id));
            else setPrices((prev) => prev.filter((p) => p.$id !== id));
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (type: 'spot' | 'price', id: string) => {
        setProcessingId(id);
        try {
            await moderateCaSertService.reject(type, id);
            if (type === 'spot') setSpots((prev) => prev.filter((s) => s.$id !== id));
            else setPrices((prev) => prev.filter((p) => p.$id !== id));
        } finally {
            setProcessingId(null);
        }
    };

    const total = spots.length + prices.length;

    if (loading) return <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>;

    if (total === 0) {
        return (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400">
                <div className="text-3xl mb-2">✨</div>
                <p className="text-sm">Rien en attente sur Ça sert pour l'instant.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {spots.map((spot) => {
                const category = SPOT_CATEGORIES.find((c) => c.slug === spot.category);
                return (
                    <div key={spot.$id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-purple-600 bg-purple-50 rounded-full px-2.5 py-1">📍 Lieu/service</span>
                            <span className="text-xs text-gray-400">{category?.icon} {category?.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{spot.name}</p>
                        {spot.description && <p className="text-xs text-gray-500">{spot.description}</p>}
                        <p className="text-xs text-gray-400">
                            {spot.quartier}{spot.quartier && spot.country ? ' · ' : ''}{spot.country}
                            {spot.phone ? ` · ${spot.phone}` : ''}
                        </p>
                        <p className="text-xs text-gray-300">Par {spot.authorName || spot.authorId}</p>
                        <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={() => handleApprove('spot', spot.$id)} isLoading={processingId === spot.$id}>
                                ✅ Valider
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleReject('spot', spot.$id)} disabled={processingId === spot.$id}>
                                ❌ Refuser
                            </Button>
                        </div>
                    </div>
                );
            })}

            {prices.map((price) => (
                <div key={price.$id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-2.5 py-1">💰 Prix</span>
                    <p className="text-sm font-semibold text-gray-800">
                        {price.item} — <span className="text-[#FF4757]">{price.price.toLocaleString('fr-FR')} F{price.unit ? `/${price.unit}` : ''}</span>
                    </p>
                    <p className="text-xs text-gray-400">{price.quartier}{price.quartier && price.country ? ' · ' : ''}{price.country}</p>
                    <p className="text-xs text-gray-300">Par {price.authorId}</p>
                    <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => handleApprove('price', price.$id)} isLoading={processingId === price.$id}>
                            ✅ Valider
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleReject('price', price.$id)} disabled={processingId === price.$id}>
                            ❌ Refuser
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};
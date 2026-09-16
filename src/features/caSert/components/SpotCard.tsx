// src/features/caSert/components/SpotCard.tsx — Ça Parle
import { useState } from 'react';
import { caSertService, getSpotImageUrl, type Spot } from '../services/caSertService';
import { SPOT_CATEGORIES } from '../config/categories';

const CATEGORY_BG: Record<string, string> = {
    manger: 'bg-orange-50',
    services: 'bg-blue-50',
    shopping: 'bg-pink-50',
    sante: 'bg-green-50',
    autre: 'bg-gray-50',
};

export const SpotCard = ({ spot }: { spot: Spot }) => {
    const [confirmCount, setConfirmCount] = useState(spot.confirmCount);
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const category = SPOT_CATEGORIES.find((c) => c.slug === spot.category);

    const handleConfirm = async () => {
        if (loading) return;
        setLoading(true);
        // Optimiste — on ajuste tout de suite, on corrige si l'appel échoue.
        setConfirmed((prev) => !prev);
        setConfirmCount((prev) => (confirmed ? prev - 1 : prev + 1));
        try {
            await caSertService.confirmSpot(spot.$id);
        } catch {
            setConfirmed((prev) => !prev);
            setConfirmCount((prev) => (confirmed ? prev + 1 : prev - 1));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white">
            {spot.photoFileId ? (
                <img src={getSpotImageUrl(spot.photoFileId)} alt="" className="w-full h-28 object-cover" />
            ) : (
                <div className={`w-full h-28 flex items-center justify-center text-4xl ${CATEGORY_BG[spot.category] || 'bg-gray-50'}`}>
                    {category?.icon || '📍'}
                </div>
            )}

            <div className="p-3">
                <p className="text-sm font-semibold text-gray-800 leading-snug">{spot.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                    {category?.label}{spot.quartier ? ` · ${spot.quartier}` : ''}
                </p>
                {spot.description && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{spot.description}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors ${
                            confirmed ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                    >
                        ✅ {confirmCount > 0 ? confirmCount : ''} Confirmé{confirmCount > 1 ? 's' : ''}
                    </button>
                    {spot.phone && (
                        <a
                            href={`tel:${spot.phone}`}
                            className="text-xs font-semibold text-[#FF4757] bg-[#FF4757]/10 rounded-full px-3 py-1.5"
                        >
                            📞 Appeler
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};
// src/features/caSert/components/SpotCard.tsx — Vanessa
import { useState } from 'react';
import { caSertService, getSpotImageUrl, type Spot } from '../services/caSertService';
import { SPOT_CATEGORIES } from '../config/categories';
import { CheckCircle2, Phone } from 'lucide-react';

const CATEGORY_BG: Record<string, string> = {
    manger: 'bg-amber-50',
    services: 'bg-sand',
    shopping: 'bg-sand',
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
                        <CheckCircle2 className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> {confirmCount > 0 ? confirmCount : ''} Confirmé{confirmCount > 1 ? 's' : ''}
                    </button>
                    {spot.phone && (
                        <a
                            href={`tel:${spot.phone}`}
                            className="text-xs font-semibold text-ochre bg-brand-tint rounded-full px-3 py-1.5"
                        >
                            <Phone className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> Appeler
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};
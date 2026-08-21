// src/features/reputation/components/BadgeGrid.tsx — Ça Parle
import type { BadgeDoc } from '../services/badgeService';

interface Props {
    catalog: BadgeDoc[];
    earnedKeys: Set<string | undefined>;
}

export const BadgeGrid = ({ catalog, earnedKeys }: Props) => {
    if (catalog.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-6 text-center text-sm text-gray-400">
                Aucun badge disponible pour l'instant.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4">🏅 Badges</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {catalog.map((badge) => {
                    const earned = earnedKeys.has(badge.key);
                    return (
                        <div
                            key={badge.$id}
                            title={badge.description}
                            className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition-all ${
                                earned ? 'bg-[#FF4757]/5 ring-1 ring-[#FF4757]/30' : 'bg-gray-50 opacity-50 grayscale'
                            }`}
                        >
                            <span className="text-2xl">{badge.icon}</span>
                            <span className="text-[11px] font-medium text-gray-600 leading-tight">{badge.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
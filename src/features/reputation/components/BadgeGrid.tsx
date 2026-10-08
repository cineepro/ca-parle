// src/features/reputation/components/BadgeGrid.tsx — Vanessa
import type { BadgeDoc } from '../services/badgeService';
import { Award } from 'lucide-react';

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
            <h2 className="text-sm font-bold text-gray-700 mb-4"><Award className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> Badges</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {catalog.map((badge) => {
                    const earned = earnedKeys.has(badge.key);
                    return (
                        <div
                            key={badge.$id}
                            title={badge.description}
                            className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition-all ${
                                earned ? 'bg-brand-tint ring-1 ring-brand' : 'bg-gray-50 opacity-50 grayscale'
                            }`}
                        >
                            <span className="text-2xl">{badge.icon}</span>
                            <span className="text-xs font-medium text-gray-600 leading-tight">{badge.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

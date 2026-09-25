// src/features/reputation/components/ReputationCard.tsx — Vanessa
import type { ReputationStats } from '../services/reputationService';

const GOSSIP_TITLES: Record<number, string> = {
    1: 'Curieux',
    2: 'Commère débutant',
    3: 'Bavard confirmé',
    4: 'Expert du ragot',
    5: 'Roi du commérage',
    6: 'Légende de Vanessa',
};

export const ReputationCard = ({ stats, name }: { stats: ReputationStats; name?: string }) => {
    const title = GOSSIP_TITLES[stats.gossipLevel] || GOSSIP_TITLES[1];

    return (
        <div className="bg-white rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-400">Niveau {stats.gossipLevel}</p>
                    <h2 className="text-lg font-bold text-gray-800">
                        {name ? `${name} — ` : ''}{title}
                    </h2>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-[#FF4757]">{stats.reputationScore}</p>
                    <p className="text-xs text-gray-400">points</p>
                </div>
            </div>

            {/* Barre de fiabilité */}
            <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Indice de fiabilité</span>
                    <span className="font-semibold">{stats.reliabilityIndex}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${
                            stats.reliabilityIndex >= 70 ? 'bg-green-500' : stats.reliabilityIndex >= 40 ? 'bg-orange-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${stats.reliabilityIndex}%` }}
                    />
                </div>
                {stats.predictionsTotal > 0 && (
                    <p className="text-[11px] text-gray-400 mt-1">
                        {stats.predictionsCorrect}/{stats.predictionsTotal} prédictions correctes
                    </p>
                )}
            </div>

            {/* Grille de stats */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 text-center">
                <div>
                    <p className="text-base font-bold text-gray-700">{stats.storiesCount}</p>
                    <p className="text-[11px] text-gray-400">Histoires</p>
                </div>
                <div>
                    <p className="text-base font-bold text-gray-700">{stats.revelationsCount}</p>
                    <p className="text-[11px] text-gray-400">Révélations</p>
                </div>
                <div>
                    <p className="text-base font-bold text-gray-700">{stats.commentsCount}</p>
                    <p className="text-[11px] text-gray-400">Commentaires</p>
                </div>
            </div>
        </div>
    );
};

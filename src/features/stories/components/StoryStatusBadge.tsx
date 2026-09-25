// src/features/stories/components/StoryStatusBadge.tsx — Vanessa
import type { StoryStatus } from '../services/storyService';

const STATUS_CONFIG: Record<StoryStatus, { label: string; dot: string }> = {
    rumeur: { label: 'Rumeur', dot: 'bg-red-500' },
    en_verification: { label: 'En vérification', dot: 'bg-orange-400' },
    confirme: { label: 'Confirmé', dot: 'bg-green-500' },
    dementi: { label: 'Démenti', dot: 'bg-gray-400' },
};

export const StoryStatusBadge = ({ status }: { status: StoryStatus }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.rumeur;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <span className={`w-2 h-2 rounded-full ${config.dot}`} />
            {config.label}
        </span>
    );
};

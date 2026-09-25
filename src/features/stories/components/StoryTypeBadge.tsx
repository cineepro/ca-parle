// src/features/stories/components/StoryTypeBadge.tsx — Vanessa
import type { StoryType } from '../services/storyService';

const TYPE_CONFIG: Record<StoryType, { label: string; icon: string; className: string }> = {
    ragot: { label: 'Ragot', icon: '👀', className: 'bg-purple-50 text-purple-600' },
    revelation: { label: 'Révélation', icon: '💥', className: 'bg-orange-50 text-orange-600' },
    temoignage: { label: 'Témoignage', icon: '🗣️', className: 'bg-blue-50 text-blue-600' },
    reaction: { label: 'Réaction', icon: '💬', className: 'bg-gray-100 text-gray-600' },
    rumeur: { label: 'Rumeur', icon: '❓', className: 'bg-yellow-50 text-yellow-700' },
    confirme: { label: 'Confirmé', icon: '✅', className: 'bg-green-50 text-green-700' },
};

export const StoryTypeBadge = ({ type }: { type: StoryType }) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.ragot;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}>
            <span>{config.icon}</span>
            {config.label}
        </span>
    );
};

// src/features/stories/components/StoryTypeBadge.tsx — Vanessa
import { Eye, Zap, MessageSquare, HelpCircle, CheckCircle2, type LucideIcon } from 'lucide-react';
import type { StoryType } from '../services/storyService';
import { Badge, type BadgeTone } from '@/components/ui/badge';

const TYPE_CONFIG: Record<StoryType, { label: string; Icon: LucideIcon; tone: BadgeTone }> = {
    ragot: { label: 'Ragot', Icon: Eye, tone: 'brand' },
    revelation: { label: 'Révélation', Icon: Zap, tone: 'danger' },
    temoignage: { label: 'Témoignage', Icon: MessageSquare, tone: 'info' },
    reaction: { label: 'Réaction', Icon: MessageSquare, tone: 'neutral' },
    rumeur: { label: 'Rumeur', Icon: HelpCircle, tone: 'warning' },
    confirme: { label: 'Confirmé', Icon: CheckCircle2, tone: 'success' },
};

export const StoryTypeBadge = ({ type }: { type: StoryType }) => {
    const { label, Icon, tone } = TYPE_CONFIG[type] || TYPE_CONFIG.ragot;
    return (
        <Badge tone={tone} icon={<Icon className="w-3.5 h-3.5" aria-hidden="true" />}>
            {label}
        </Badge>
    );
};

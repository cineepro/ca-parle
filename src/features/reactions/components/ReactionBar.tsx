// src/features/reactions/components/ReactionBar.tsx — Ça Parle
import { useReactions } from '../hooks/useReactions';
import type { ReactionType } from '../services/reactionService';

const QUICK_REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
    { type: 'fire', emoji: '🔥', label: 'Chaud' },
    { type: 'laugh', emoji: '😂', label: 'Mort de rire' },
    { type: 'shock', emoji: '😲', label: 'Choqué' },
];

const BELIEF_REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
    { type: 'true', emoji: '💯', label: '100% vrai' },
    { type: 'possible', emoji: '🤔', label: 'Possible' },
    { type: 'false', emoji: '❌', label: "J'y crois pas" },
];

interface Props {
    targetType: 'story' | 'comment';
    targetId: string;
    initialCount?: number;
}

export const ReactionBar = ({ targetType, targetId, initialCount }: Props) => {
    const { counts, userReaction, total, react, submitting } = useReactions(targetType, targetId, initialCount);

    const renderButton = (type: ReactionType, emoji: string, label: string) => {
        const isActive = userReaction === type;
        const count = counts?.[type] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;

        return (
            <button
                key={type}
                type="button"
                onClick={() => react(type)}
                disabled={submitting}
                title={label}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 ${
                    isActive ? 'bg-[#FF4757]/10 text-[#FF4757] ring-1 ring-[#FF4757]/40' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
            >
                <span className="text-lg leading-none">{emoji}</span>
                <span>{count > 0 ? `${count}` : label}</span>
                {counts && total > 0 && <span className="text-[10px] text-gray-400">{percent}%</span>}
            </button>
        );
    };

    return (
        <div className="space-y-2">
            <div>
                <p className="text-xs text-gray-400 mb-1.5">Ta réaction</p>
                <div className="flex gap-2">
                    {QUICK_REACTIONS.map((r) => renderButton(r.type, r.emoji, r.label))}
                </div>
            </div>
            <div>
                <p className="text-xs text-gray-400 mb-1.5">Tu y crois ?</p>
                <div className="flex gap-2">
                    {BELIEF_REACTIONS.map((r) => renderButton(r.type, r.emoji, r.label))}
                </div>
            </div>
            <p className="text-[11px] text-gray-300">Une seule réaction active à la fois.</p>
        </div>
    );
};

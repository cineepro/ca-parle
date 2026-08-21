// src/features/story-updates/components/StoryTimeline.tsx — Ça Parle
import { useState } from 'react';
import { useStoryUpdates } from '../hooks/useStoryUpdates';
import type { StoryUpdateType } from '../services/storyUpdateService';
import { Button } from '@/components/ui/button';

interface Props {
    storyId: string;
    isStoryAuthor: boolean;
}

const TYPE_CONFIG: Record<StoryUpdateType, { icon: string; label: string; color: string }> = {
    mise_a_jour: { icon: '📌', label: 'Mise à jour', color: 'text-gray-500' },
    contradiction: { icon: '⚠️', label: 'Contradiction', color: 'text-orange-500' },
    confirmation: { icon: '✅', label: 'Confirmation', color: 'text-green-600' },
    dementi: { icon: '❌', label: 'Démenti', color: 'text-red-500' },
};

const formatDate = (dateStr: string): string =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export const StoryTimeline = ({ storyId, isStoryAuthor }: Props) => {
    const { updates, loading, posting, addUpdate } = useStoryUpdates(storyId);
    const [open, setOpen] = useState(false);
    const [content, setContent] = useState('');
    const [type, setType] = useState<StoryUpdateType>('mise_a_jour');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        await addUpdate(content, type);
        setContent('');
        setOpen(false);
    };

    if (loading) return null;

    return (
        <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700">🕰️ Ce que Ça Parle sait</h2>

            {updates.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune mise à jour pour l'instant.</p>
            ) : (
                <div className="space-y-3 border-l-2 border-gray-100 pl-4">
                    {updates.map((update) => {
                        const config = TYPE_CONFIG[update.type] || TYPE_CONFIG.mise_a_jour;
                        return (
                            <div key={update.$id} className="relative">
                                <span className="absolute -left-[21px] top-0.5 text-sm">{config.icon}</span>
                                <p className="text-xs text-gray-400">{formatDate(update.$createdAt)}</p>
                                <p className={`text-xs font-semibold ${config.color}`}>{config.label}</p>
                                <p className="text-sm text-gray-700 mt-0.5">{update.content}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {isStoryAuthor && (
                <div className="pt-2">
                    {!open ? (
                        <button onClick={() => setOpen(true)} className="text-sm text-[#FF4757] font-medium hover:underline">
                            + Ajouter une mise à jour
                        </button>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-2 bg-gray-50 rounded-2xl p-3">
                            <div className="flex flex-wrap gap-1.5">
                                {(Object.keys(TYPE_CONFIG) as StoryUpdateType[]).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${
                                            type === t ? 'border-[#FF4757] bg-white text-[#FF4757]' : 'border-gray-200 text-gray-500'
                                        }`}
                                    >
                                        {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={2}
                                maxLength={2000}
                                placeholder="Quoi de neuf sur cette histoire ?"
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40 resize-none"
                            />
                            <div className="flex gap-2">
                                <Button type="submit" size="sm" isLoading={posting}>Publier</Button>
                                <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};
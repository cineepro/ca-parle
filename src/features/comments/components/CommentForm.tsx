// src/features/comments/components/CommentForm.tsx — Ça Parle
import { useState } from 'react';
import type { CommentType } from '../services/commentService';
import { Button } from '@/components/ui/button';

interface Props {
    onSubmit: (content: string, type: CommentType, isAnonymous: boolean) => void;
    posting: boolean;
    placeholder?: string;
    compact?: boolean;
}

const TYPE_OPTIONS: { value: CommentType; label: string; icon: string }[] = [
    { value: 'commentaire', label: 'Commentaire', icon: '💬' },
    { value: 'temoignage', label: 'Témoignage', icon: '🗣️' },
    { value: 'revelation', label: 'Révélation', icon: '💥' },
];

export const CommentForm = ({ onSubmit, posting, placeholder = 'Dis ce que tu en penses...', compact = false }: Props) => {
    const [content, setContent] = useState('');
    const [type, setType] = useState<CommentType>('commentaire');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        onSubmit(content, type, isAnonymous);
        setContent('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            {!compact && (
                <div className="flex gap-1.5">
                    {TYPE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setType(opt.value)}
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${
                                type === opt.value
                                    ? 'border-[#FF4757] bg-[#FF4757]/5 text-[#FF4757]'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                        >
                            <span>{opt.icon}</span>
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-2 items-end">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={placeholder}
                    rows={compact ? 1 : 2}
                    maxLength={1000}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40 resize-none"
                />
                <Button type="submit" size="sm" isLoading={posting} disabled={!content.trim()}>
                    Envoyer
                </Button>
            </div>

            {!compact && (
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#FF4757] cursor-pointer"
                    />
                    🕵️ Rester anonyme
                </label>
            )}
        </form>
    );
};

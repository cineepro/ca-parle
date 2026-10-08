// src/features/comments/components/CommentForm.tsx — Vanessa
import { useState } from 'react';
import type { CommentType } from '../services/commentService';
import { Button } from '@/components/ui/button';
import { EyeOff, MessageCircle, MessageSquare, Zap, type LucideIcon } from 'lucide-react';

interface Props {
    onSubmit: (content: string, type: CommentType, isAnonymous: boolean) => void;
    posting: boolean;
    placeholder?: string;
    compact?: boolean;
}

const TYPE_OPTIONS: { value: CommentType; label: string; Icon: LucideIcon }[] = [
    { value: 'commentaire', label: 'Commentaire', Icon: MessageCircle },
    { value: 'temoignage', label: 'Témoignage', Icon: MessageSquare },
    { value: 'revelation', label: 'Révélation', Icon: Zap },
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
                                    ? 'border-brand bg-brand-tint text-ochre'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                        >
                            <opt.Icon className="w-4 h-4" aria-hidden="true" />
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
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
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
                        className="w-3.5 h-3.5 accent-brand cursor-pointer"
                    />
                    <EyeOff className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> Rester anonyme
                </label>
            )}
        </form>
    );
};

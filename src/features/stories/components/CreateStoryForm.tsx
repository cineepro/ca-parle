// src/features/stories/components/CreateStoryForm.tsx — Ça Parle
import { useState } from 'react';
import { useCreateStory } from '../hooks/useCreateStory';
import { CATEGORIES } from '@/config/categories';
import type { StoryType } from '../services/storyService';
import { Button } from '@/components/ui/button';
import { ReferenceTagInput } from '@/features/references/components/ReferenceTagInput';
import type { Reference } from '@/features/references/services/referenceService';

const TYPE_OPTIONS: { value: StoryType; label: string; icon: string }[] = [
    { value: 'ragot', label: 'Ragot', icon: '👀' },
    { value: 'revelation', label: 'Révélation', icon: '💥' },
    { value: 'temoignage', label: 'Témoignage', icon: '🗣️' },
    { value: 'rumeur', label: 'Rumeur', icon: '❓' },
];

export const CreateStoryForm = () => {
    const { createStory, loading, error } = useCreateStory();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<StoryType>('ragot');
    const [categoryId, setCategoryId] = useState(CATEGORIES[1]?.slug || 'people');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [references, setReferences] = useState<Reference[]>([]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createStory({ title, content, type, categoryId, isAnonymous, referenceIds: references.map((r) => r.$id) });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type de publication */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de publication</label>
                <div className="grid grid-cols-2 gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setType(opt.value)}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border transition-all ${
                                type === opt.value
                                    ? 'border-[#FF4757] bg-[#FF4757]/5 text-[#FF4757]'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            <span>{opt.icon}</span>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Catégorie */}
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Catégorie
                </label>
                <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                >
                    {CATEGORIES.filter((c) => c.slug !== 'tout').map((cat) => (
                        <option key={cat.slug} value={cat.slug}>
                            {cat.icon} {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Titre */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Titre accrocheur
                </label>
                <input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={150}
                    placeholder="Il paraît que..."
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                />
            </div>

            {/* Contenu */}
            <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Raconte tout
                </label>
                <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={5000}
                    rows={6}
                    placeholder="Donne les détails, le contexte..."
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{content.length}/5000</p>
            </div>

            <ReferenceTagInput selected={references} onChange={setReferences} />

            {/* Anonymat */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 accent-[#FF4757] cursor-pointer shrink-0"
                />
                <label htmlFor="anonymous" className="text-sm text-gray-600 cursor-pointer select-none">
                    🕵️ Publier anonymement (ton nom ne sera pas affiché aux autres utilisateurs)
                </label>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                    ❌ {error}
                </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
                Publier l'histoire
            </Button>
        </form>
    );
};
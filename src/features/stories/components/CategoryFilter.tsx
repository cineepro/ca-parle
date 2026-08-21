// src/features/stories/components/CategoryFilter.tsx — Ça Parle
import { CATEGORIES } from '@/config/categories';

interface Props {
    selected: string;
    onSelect: (slug: string) => void;
}

export const CategoryFilter = ({ selected, onSelect }: Props) => {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {CATEGORIES.map((cat) => (
                <button
                    key={cat.slug}
                    onClick={() => onSelect(cat.slug)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        selected === cat.slug
                            ? 'bg-[#FF4757] text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-[#FF4757]/40'
                    }`}
                >
                    <span>{cat.icon}</span>
                    {cat.name}
                </button>
            ))}
        </div>
    );
};
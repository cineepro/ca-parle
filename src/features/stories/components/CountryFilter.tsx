// src/features/stories/components/CountryFilter.tsx — Ça Parle
import { COUNTRIES } from '@/config/countries';

interface Props {
    selected: string;
    onSelect: (slug: string) => void;
}

export const CountryFilter = ({ selected, onSelect }: Props) => {
    return (
        <select
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
            className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
        >
            {COUNTRIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                    {c.flag} {c.name}
                </option>
            ))}
        </select>
    );
};
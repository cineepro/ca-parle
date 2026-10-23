// src/features/moteur/components/ZemSearchBar.tsx — Zem
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { ZemRider } from './ZemRider';
import { PLACEHOLDERS } from '../lib/phrases';

interface Props {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    busy?: boolean;
}

export const ZemSearchBar = ({ value, onChange, onSubmit, busy }: Props) => {
    const [ph, setPh] = useState(0);
    useEffect(() => {
        if (value) return;
        const t = window.setInterval(() => setPh((p) => (p + 1) % PLACEHOLDERS.length), 3500);
        return () => window.clearInterval(t);
    }, [value]);

    return (
        <form
            onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
            role="search"
            className="flex items-center gap-2 bg-white rounded-full border-2 border-brand shadow pl-2 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-ink/30"
        >
            {/* Le petit zem qui veille dans la barre */}
            <ZemRider size="sm" className="w-11 h-auto shrink-0" />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={PLACEHOLDERS[ph]}
                aria-label="Chercher avec Zem"
                enterKeyHint="search"
                maxLength={120}
                className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-gray-400 outline-none py-2"
            />
            <button
                type="submit"
                disabled={busy || value.trim().length < 2}
                className="shrink-0 flex items-center gap-1.5 rounded-full bg-brand text-ink font-bold px-4 min-h-[44px] disabled:opacity-50"
            >
                <Search size={18} aria-hidden /> <span>Go</span>
            </button>
        </form>
    );
};

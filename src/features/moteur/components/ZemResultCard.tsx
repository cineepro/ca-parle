// src/features/moteur/components/ZemResultCard.tsx — Zem
import type { ZemResult } from '../services/moteurService';
import { CATEGORY_META, TRUST_META, freshnessLabel, READ_HERE } from '../lib/phrases';
import { highlightPieces } from '../lib/highlight';
import { openExternal } from '../lib/openExternal';

interface Props {
    result: ZemResult;
    words?: string[];
    onRead: (r: ZemResult) => void;
}

export const ZemResultCard = ({ result, words = [], onRead }: Props) => {
    const trust = TRUST_META[result.trust] || TRUST_META[1];
    const cat = CATEGORY_META[result.category] || CATEGORY_META.autre;
    const when = freshnessLabel(result.publishedAt);
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mb-1">
                <span className="font-semibold text-gray-700 truncate max-w-[60%]">{result.sourceLabel || result.host}</span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${trust.className}`}>{trust.label}</span>
                <span>{cat.emoji} {cat.label}</span>
                {result.city && <span>📍 {result.city}</span>}
                {when && <span className="text-ochre font-semibold">{when}</span>}
            </div>
            <a
                href={result.url}
                onClick={(e) => { e.preventDefault(); openExternal(result.url); }}
                className="block text-base font-bold text-ink hover:underline break-words"
            >
                {result.title}
            </a>
            {result.snippet && (
                <p className="text-sm text-gray-600 mt-1 break-words">
                    {highlightPieces(result.snippet, words).map((p, i) =>
                        p.hit ? <mark key={i} className="bg-brand/40 text-ink rounded px-0.5">{p.text}</mark> : <span key={i}>{p.text}</span>
                    )}
                </p>
            )}
            <button
                onClick={() => onRead(result)}
                className="mt-2 text-sm font-semibold text-ochre min-h-[44px] -mb-2"
            >
                {READ_HERE} →
            </button>
        </article>
    );
};

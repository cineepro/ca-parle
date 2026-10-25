// src/features/moteur/components/ZemTile.tsx — Zem
// Une « case » de la mosaïque, en 4 formes : hero (grande), half (moitié), wide (large), row (ligne).
import { moteurService, type ZemResult } from '../services/moteurService';
import { CATEGORY_META, CATEGORY_TONE, TRUST_META, freshnessLabel, READ_HERE } from '../lib/phrases';
import { highlightPieces } from '../lib/highlight';
import { openExternal } from '../lib/openExternal';

export type TileVariant = 'hero' | 'half' | 'wide' | 'row';
interface Props { result: ZemResult; variant: TileVariant; words?: string[]; onRead: (r: ZemResult) => void }

const Snippet = ({ text, words, className }: { text: string; words: string[]; className: string }) => (
    <p className={className}>
        {highlightPieces(text, words).map((p, i) =>
            p.hit ? <mark key={i} className="bg-brand/40 text-inherit rounded px-0.5">{p.text}</mark> : <span key={i}>{p.text}</span>
        )}
    </p>
);

export const ZemTile = ({ result, variant, words = [], onRead }: Props) => {
    const trust = TRUST_META[result.trust] || TRUST_META[1];
    const cat = CATEGORY_META[result.category] || CATEGORY_META.autre;
    const tone = CATEGORY_TONE[result.category] || CATEGORY_TONE.autre;
    const when = freshnessLabel(result.publishedAt);
    const internal = result.url.startsWith('zem:'); // fiches et notes : pas de page web, on ouvre le lecteur
    const open = () => {
        moteurService.click(result.id);
        if (internal) onRead(result); else openExternal(result.url);
    };
    const read = () => { moteurService.click(result.id); onRead(result); };
    const source = result.sourceLabel || result.host;

    const TitleButton = ({ className }: { className: string }) => (
        <a href={internal ? '#' : result.url} onClick={(e) => { e.preventDefault(); open(); }} className={`block break-words hover:underline ${className}`}>
            {result.title}
        </a>
    );
    const Trust = ({ dark = false }: { dark?: boolean }) => (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${dark ? 'bg-white/15 text-cream' : trust.className}`}>{trust.label}</span>
    );

    if (variant === 'hero') {
        return (
            <article className="col-span-2 relative overflow-hidden rounded-3xl bg-ink text-cream p-5 zem-pagne">
                <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tone.strong} text-ink`}><span aria-hidden>{cat.emoji}</span>{cat.label}</span>
                    <Trust dark />
                    {when && <span className="text-xs font-semibold text-brand">{when}</span>}
                </div>
                <TitleButton className="text-xl sm:text-2xl font-extrabold leading-tight text-cream" />
                {result.snippet && <Snippet text={result.snippet} words={words} className="mt-2 text-sm text-gray-300 line-clamp-4 break-words" />}
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-300">
                    <span className="truncate">{source}{result.city ? ` · 📍 ${result.city}` : ''}</span>
                    <button onClick={read} className="shrink-0 rounded-full bg-brand text-ink font-bold px-4 min-h-[44px]">{READ_HERE} →</button>
                </div>
            </article>
        );
    }

    if (variant === 'half') {
        return (
            <article className="col-span-1 flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-100">
                <div className={`${tone.soft} ${tone.text} px-3 py-2 flex flex-wrap items-center justify-between gap-x-2`}>
                    <span className="text-xs font-bold"><span aria-hidden>{cat.emoji}</span> {cat.label}</span>
                    {when && <span className="shrink-0 text-[11px] font-semibold">{when}</span>}
                </div>
                <div className="p-3 flex flex-col flex-1">
                    <TitleButton className="text-sm font-bold text-ink leading-snug line-clamp-4" />
                    <div className="mt-auto pt-2 flex flex-wrap items-center gap-1.5">
                        <Trust />
                        <span className="text-[11px] text-gray-500 truncate max-w-full">{source}</span>
                    </div>
                    <button onClick={read} className="mt-1 -mb-1 text-left text-xs font-semibold text-ochre min-h-[44px]">{READ_HERE} →</button>
                </div>
            </article>
        );
    }

    if (variant === 'wide') {
        return (
            <article className="col-span-2 flex overflow-hidden rounded-2xl bg-white border border-gray-100">
                <div className={`${tone.soft} ${tone.text} w-20 sm:w-24 shrink-0 flex flex-col items-center justify-center gap-1 p-2 text-center`}>
                    <span className="text-3xl" aria-hidden>{cat.emoji}</span>
                    <span className="text-[11px] font-bold leading-tight">{cat.label}</span>
                </div>
                <div className="p-3 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 mb-1">
                        <Trust />{when && <span className="text-ochre font-semibold">{when}</span>}{result.city && <span>📍 {result.city}</span>}
                    </div>
                    <TitleButton className="text-base font-bold text-ink leading-snug" />
                    {result.snippet && <Snippet text={result.snippet} words={words} className="mt-1 text-sm text-gray-600 line-clamp-2 break-words" />}
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-gray-400 truncate">{source}</span>
                        <button onClick={read} className="shrink-0 text-xs font-semibold text-ochre min-h-[44px]">{READ_HERE} →</button>
                    </div>
                </div>
            </article>
        );
    }

    // row : ligne compacte, pour les résultats qu'on survole
    return (
        <article className="flex items-center gap-3 px-3 py-2.5">
            <span className={`${tone.soft} w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-lg`} aria-hidden>{cat.emoji}</span>
            <div className="min-w-0 flex-1">
                <TitleButton className="text-sm font-semibold text-ink leading-snug line-clamp-2" />
                <p className="text-[11px] text-gray-500 truncate">{source}{when ? ` · ${when}` : ''}</p>
            </div>
            <button onClick={read} aria-label={`${READ_HERE} : ${result.title}`} className="shrink-0 text-ochre font-bold text-lg min-w-[44px] min-h-[44px]">→</button>
        </article>
    );
};

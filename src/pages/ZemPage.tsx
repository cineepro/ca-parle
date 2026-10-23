// src/pages/ZemPage.tsx — Zem
// Zem : le navigateur-moteur de recherche local de Vanessa. Cherche dans les sites béninois choisis
// par l'équipe (Console → Zem). Pendant la recherche, le zem roule de gauche à droite jusqu'aux résultats.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { moteurService, browseCategory, type ZemCategory, type ZemHome, type ZemResult } from '@/features/moteur/services/moteurService';
import { ZemRider } from '@/features/moteur/components/ZemRider';
import { ZemTrack, type TrackState } from '@/features/moteur/components/ZemTrack';
import { ZemSearchBar } from '@/features/moteur/components/ZemSearchBar';
import { ZemResultCard } from '@/features/moteur/components/ZemResultCard';
import { ZemReader } from '@/features/moteur/components/ZemReader';
import {
    ZEM_TAGLINE, ZEM_SUBTITLE, WAITING_LINES, ARRIVED, NOTHING_FOUND_TITLE, NOTHING_FOUND_HELP, ERROR_LINE,
    HOME_EMPTY, LATEST_TITLE, RUBRICS_TITLE, ASK_VANESSA, CATEGORY_META, CATEGORY_ORDER,
} from '@/features/moteur/lib/phrases';

const isCategory = (v: string | null): v is ZemCategory => !!v && v in CATEGORY_META;

export default function ZemPage() {
    const { user } = useAuth();
    const [params, setParams] = useSearchParams();
    const [text, setText] = useState(params.get('q') || '');
    const [category, setCategory] = useState<ZemCategory | ''>(isCategory(params.get('c')) ? (params.get('c') as ZemCategory) : '');
    const [home, setHome] = useState<ZemHome | null>(null);
    const [results, setResults] = useState<ZemResult[] | null>(null);
    const [words, setWords] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [track, setTrack] = useState<TrackState>('idle');
    const [error, setError] = useState(false);
    const [reading, setReading] = useState<ZemResult | null>(null);
    const [waitingLine, setWaitingLine] = useState(WAITING_LINES[0]);
    const runId = useRef(0); // ignore les réponses d'une recherche déjà remplacée

    useEffect(() => { moteurService.home().then(setHome).catch(() => setHome({ categories: {}, latest: [] })); }, []);

    const run = useCallback(async (q: string, cat: ZemCategory | '', nextPage = 0) => {
        const term = q.trim();
        if (term.length < 2 && !cat) return;
        const id = ++runId.current;
        setError(false);
        if (nextPage === 0) {
            setTrack('loading');
            setWaitingLine(WAITING_LINES[Math.floor(Math.random() * WAITING_LINES.length)]);
        }
        try {
            const r = term.length >= 2
                ? await moteurService.search(term, { category: cat, page: nextPage })
                : await browseCategory(cat as ZemCategory, nextPage);
            if (id !== runId.current) return;
            setResults((prev) => (nextPage === 0 ? r.results : [...(prev || []), ...r.results]));
            setWords(r.words);
            setTotal(r.total);
            setPage(nextPage);
            setHasMore(r.hasMore);
            if (nextPage === 0) setTrack('done');
        } catch {
            if (id !== runId.current) return;
            setError(true);
            setResults([]);
            setTrack('idle');
        }
    }, []);

    // Un lien /zem?q=... (barre d'adresse, moteur ajouté au navigateur) lance la recherche tout de suite.
    useEffect(() => {
        const q = params.get('q');
        if (q) run(q, category);
        else if (category) run('', category);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = (cat: ZemCategory | '' = category) => {
        const next = new URLSearchParams();
        if (text.trim()) next.set('q', text.trim());
        if (cat) next.set('c', cat);
        setParams(next, { replace: false });
        run(text, cat);
    };

    const pickCategory = (c: ZemCategory) => {
        const next: ZemCategory | '' = category === c ? '' : c;
        setCategory(next);
        if (next || text.trim().length >= 2) {
            const sp = new URLSearchParams();
            if (text.trim()) sp.set('q', text.trim());
            if (next) sp.set('c', next);
            setParams(sp);
            run(text, next);
        } else {
            setParams({});
            setResults(null);
        }
    };

    const reset = () => { setText(''); setCategory(''); setResults(null); setError(false); setTrack('idle'); setParams({}); runId.current++; };
    const searching = results !== null || track === 'loading';

    return (
        <div className="min-h-screen bg-cream">
            <div className="max-w-2xl mx-auto px-4 pt-5 pb-24">
                {/* En-tête */}
                <header className={searching ? 'flex items-center gap-3 mb-3' : 'text-center mb-4'}>
                    {!searching && <ZemRider size="lg" bob className="mx-auto w-52 sm:w-64 h-auto" />}
                    <button onClick={reset} className={searching ? 'text-left' : 'mx-auto block'} aria-label="Retour à l’accueil de Zem">
                        <h1 className={`font-extrabold text-ink tracking-tight ${searching ? 'text-2xl' : 'text-4xl mt-1'}`}>Zem</h1>
                        {!searching && <p className="text-ochre font-semibold">{ZEM_TAGLINE}</p>}
                    </button>
                </header>
                {!searching && <p className="text-center text-sm text-gray-600 mb-4">{ZEM_SUBTITLE}</p>}

                <ZemSearchBar value={text} onChange={setText} onSubmit={() => submit()} busy={track === 'loading'} />

                {/* La route : le zem roule pendant la recherche */}
                <div className="mt-2">
                    <ZemTrack state={track} line={waitingLine} />
                    <p className="text-center text-xs font-semibold text-ochre h-4" aria-hidden>
                        {track === 'loading' ? waitingLine : track === 'done' ? ARRIVED : ''}
                    </p>
                </div>

                {/* Rubriques */}
                <section className="mt-4" aria-label={RUBRICS_TITLE}>
                    {!searching && <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">{RUBRICS_TITLE}</h2>}
                    <div className={searching ? 'flex gap-2 overflow-x-auto scrollbar-hide pb-1' : 'grid grid-cols-2 sm:grid-cols-3 gap-2'}>
                        {CATEGORY_ORDER.map((c) => {
                            const n = home?.categories[c];
                            const active = category === c;
                            const empty = home && !n;
                            return (
                                <button
                                    key={c}
                                    onClick={() => pickCategory(c)}
                                    aria-pressed={active}
                                    className={`shrink-0 rounded-2xl border text-left min-h-[44px] px-3 py-2 transition-colors ${
                                        active ? 'bg-brand border-brand text-ink' : 'bg-white border-gray-100 hover:bg-sand text-ink'
                                    } ${empty && !active ? 'opacity-50' : ''}`}
                                >
                                    <span className="text-lg mr-1.5" aria-hidden>{CATEGORY_META[c].emoji}</span>
                                    <span className="font-semibold text-sm">{CATEGORY_META[c].label}</span>
                                    {!searching && !!n && <span className="block text-xs text-gray-500 pl-7">{n} page{n > 1 ? 's' : ''}</span>}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Résultats */}
                {results !== null && (
                    <section className="mt-5" aria-live="polite">
                        {error && <p className="text-center text-sm text-red-700 bg-red-50 rounded-2xl p-4">{ERROR_LINE}</p>}
                        {!error && results.length === 0 && track !== 'loading' && (
                            <div className="text-center bg-white rounded-3xl border border-gray-100 p-6">
                                <ZemRider size="sm" className="w-20 mx-auto opacity-80" />
                                <p className="font-bold text-ink mt-2">{NOTHING_FOUND_TITLE}</p>
                                <p className="text-sm text-gray-600 mt-1">{NOTHING_FOUND_HELP}</p>
                                <Link to="/accueil" className="inline-block mt-3 rounded-full bg-brand text-ink font-bold px-5 min-h-[44px] leading-[44px]">{ASK_VANESSA}</Link>
                            </div>
                        )}
                        {results.length > 0 && (
                            <>
                                <p className="text-xs text-gray-500 mb-2">{total} page{total > 1 ? 's' : ''} trouvée{total > 1 ? 's' : ''}</p>
                                <div className="space-y-3">
                                    {results.map((r) => <ZemResultCard key={r.id} result={r} words={words} onRead={setReading} />)}
                                </div>
                                {hasMore && (
                                    <button
                                        onClick={() => run(text, category, page + 1)}
                                        className="mt-4 w-full rounded-full bg-white border border-gray-200 font-semibold text-ink min-h-[48px] hover:bg-sand"
                                    >
                                        Voir plus
                                    </button>
                                )}
                                <p className="text-center mt-4"><Link to="/accueil" className="text-sm font-semibold text-ochre">{ASK_VANESSA}</Link></p>
                            </>
                        )}
                    </section>
                )}

                {/* Accueil : dernières nouvelles */}
                {results === null && home && (
                    <section className="mt-6">
                        {home.latest.length > 0 ? (
                            <>
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">{LATEST_TITLE}</h2>
                                <div className="space-y-3">
                                    {home.latest.map((r) => <ZemResultCard key={r.id} result={r} onRead={setReading} />)}
                                </div>
                            </>
                        ) : (
                            <div className="text-center bg-white rounded-3xl border border-gray-100 p-6">
                                <p className="text-sm text-gray-600">{HOME_EMPTY}</p>
                                {user?.isModerator && (
                                    <Link to="/moderation?section=zem" className="inline-block mt-3 text-sm font-bold text-ochre">Ajouter des sites dans la Console →</Link>
                                )}
                            </div>
                        )}
                    </section>
                )}
            </div>
            {reading && <ZemReader result={reading} onClose={() => setReading(null)} />}
        </div>
    );
}

// src/features/stories/components/ReelFeed.tsx — Vanessa
// Le fil plein écran : une histoire par écran, défilement vertical qui
// "s'aimante" sur chaque histoire (comme TikTok). Le classement vient de
// l'algorithme (utils/feedRanking.ts).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Ear, RefreshCw } from 'lucide-react';
import { useStoryFeed } from '../hooks/useStoryFeed';
import { StoryReel } from './StoryReel';
import { Button } from '@/components/ui/button';
import { storyService } from '../services/storyService';
import { claimView, markSeen, recordSignal } from '../utils/feedRanking';

// Position retrouvée au retour d'une histoire ouverte (mémoire de session).
const LAST_ACTIVE = new Map<string, string>();

const DWELL_MS = 1500; // temps minimum sur une histoire pour qu'elle compte comme "vue"

export const ReelFeed = ({ categorySlug, countrySlug }: { categorySlug: string; countrySlug: string }) => {
    const { stories, loading, loadingMore, hasMore, error, loadMore, refresh } = useStoryFeed(
        categorySlug,
        countrySlug,
        { ranked: true }
    );
    const filterKey = `${categorySlug}|${countrySlug}`;

    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const restored = useRef(false);

    // Quelle histoire est à l'écran ? (celle dont plus de 60 % est visible)
    useEffect(() => {
        const root = containerRef.current;
        if (!root || stories.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                        const index = Number((entry.target as HTMLElement).dataset.index);
                        if (!Number.isNaN(index)) setActiveIndex(index);
                    }
                }
            },
            { root, threshold: [0.6] }
        );
        root.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [stories.length]);

    // Retour d'une histoire : on revient exactement où on était.
    useEffect(() => {
        if (restored.current || stories.length === 0) return;
        restored.current = true;
        const id = LAST_ACTIVE.get(filterKey);
        if (!id) return;
        const el = containerRef.current?.querySelector<HTMLElement>(`[data-story="${id}"]`);
        if (el) {
            const root = containerRef.current!;
            root.style.scrollBehavior = 'auto';
            root.scrollTop = el.offsetTop;
            root.style.scrollBehavior = '';
        }
    }, [stories.length, filterKey]);

    // Nouveau filtre : on repart du début.
    useEffect(() => {
        restored.current = false;
        setActiveIndex(0);
        if (containerRef.current) containerRef.current.scrollTop = 0;
    }, [filterKey]);

    // Histoire à l'écran : on mémorise sa position, puis après un court
    // moment on la compte comme vue (une seule fois) et on affine le profil.
    const active = stories[activeIndex];
    useEffect(() => {
        if (!active) return;
        LAST_ACTIVE.set(filterKey, active.$id);
        const timer = window.setTimeout(() => {
            markSeen(active.$id);
            recordSignal(active, 1);
            if (claimView(active.$id)) storyService.incrementView(active.$id);
        }, DWELL_MS);
        return () => window.clearTimeout(timer);
    }, [active, filterKey]);

    // Presque à la fin : on charge la suite avant que la personne l'atteigne.
    useEffect(() => {
        if (hasMore && stories.length > 0 && activeIndex >= stories.length - 4) loadMore();
    }, [activeIndex, stories.length, hasMore, loadMore]);

    const scrollByScreen = useCallback((direction: 1 | -1) => {
        const root = containerRef.current;
        if (root) root.scrollBy({ top: direction * root.clientHeight });
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.target !== e.currentTarget) return; // ne pas voler les flèches des champs de saisie
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            scrollByScreen(1);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            scrollByScreen(-1);
        }
    };

    const handleRefresh = async () => {
        await refresh();
        LAST_ACTIVE.delete(filterKey);
        if (containerRef.current) containerRef.current.scrollTop = 0;
    };

    if (loading) {
        return (
            <div role="status" className="h-full flex items-center justify-center bg-ink text-white">
                <svg className="animate-spin w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="sr-only">Chargement du fil…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div role="alert" className="h-full flex flex-col items-center justify-center gap-4 bg-ink px-8 text-center text-white">
                <p className="text-lg">{error}</p>
                <Button onClick={handleRefresh}>Réessayer</Button>
            </div>
        );
    }

    if (stories.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3 bg-ink px-8 text-center text-white">
                <Ear className="w-12 h-12 text-brand" aria-hidden="true" />
                <p className="text-xl font-display font-semibold">Rien ne se raconte encore ici.</p>
                <p className="text-white/80">Sois le premier à lancer une histoire !</p>
            </div>
        );
    }

    return (
        <>
            <div
                ref={containerRef}
                role="feed"
                aria-busy={loadingMore}
                aria-label="Histoires"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                className="h-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain motion-safe:scroll-smooth scrollbar-hide focus-visible:outline-brand"
            >
                {stories.map((story, index) => (
                    <div
                        key={story.$id}
                        data-index={index}
                        data-story={story.$id}
                        className="h-full w-full snap-start snap-always"
                    >
                        <StoryReel story={story} near={Math.abs(index - activeIndex) <= 1} />
                    </div>
                ))}

                {/* Fin du fil */}
                <div className="h-full w-full snap-start snap-always flex flex-col items-center justify-center gap-4 bg-ink px-8 text-center text-white">
                    {hasMore ? (
                        <span role="status" className="text-white/80">Chargement de la suite…</span>
                    ) : (
                        <>
                            <p className="font-display text-2xl font-semibold">Tu es à jour !</p>
                            <p className="text-white/80">Tu as vu toutes les histoires du moment.</p>
                            <Button onClick={handleRefresh}>
                                <RefreshCw className="w-4 h-4" aria-hidden="true" /> Actualiser
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Flèches pour souris (grands écrans) */}
            <div className="hidden lg:flex absolute left-full top-1/2 -translate-y-1/2 ml-4 flex-col gap-3">
                <button
                    type="button"
                    onClick={() => scrollByScreen(-1)}
                    disabled={activeIndex === 0}
                    aria-label="Histoire précédente"
                    className="w-11 h-11 rounded-full bg-sand text-ink flex items-center justify-center hover:bg-gray-200 disabled:opacity-40"
                >
                    <ChevronUp className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => scrollByScreen(1)}
                    aria-label="Histoire suivante"
                    className="w-11 h-11 rounded-full bg-sand text-ink flex items-center justify-center hover:bg-gray-200"
                >
                    <ChevronDown className="w-5 h-5" aria-hidden="true" />
                </button>
            </div>
        </>
    );
};
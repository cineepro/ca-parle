// src/features/uac/components/UacTab.tsx — Vanessa
// Onglet « UAC » de Ça Parle : menu du jour, filtres, actualités des étudiants.
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NEWS_KINDS, type NewsKind } from '../config';
import { uacService, type UacNews } from '../services/uacService';
import { MenuStrip } from './MenuStrip';
import { NewsCard } from './NewsCard';
import { PublishNewsSheet } from './PublishNewsSheet';
import { CampusMap } from './CampusMap';

const PAGE = 15;

export const UacTab = () => {
    const { user } = useAuth();
    const [kind, setKind] = useState<NewsKind | 'tout'>('tout');
    const [items, setItems] = useState<UacNews[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [mapOpen, setMapOpen] = useState(false);

    const load = useCallback(async (reset: boolean, after?: string) => {
        setLoading(true);
        setError(null);
        try {
            const r = await uacService.listNews(kind, after, PAGE);
            setItems((prev) => (reset ? r.documents : [...prev, ...r.documents]));
            setHasMore(r.documents.length === PAGE);
        } catch {
            setError('Impossible de charger les actualités pour l’instant.');
        } finally {
            setLoading(false);
        }
    }, [kind]);

    useEffect(() => { load(true); }, [load]);

    const remove = async (id: string) => {
        if (!window.confirm('Supprimer cette actualité ?')) return;
        try { await uacService.deleteNews(id); setItems((p) => p.filter((n) => n.$id !== id)); }
        catch (e) { setError(e instanceof Error ? e.message : 'Suppression impossible.'); }
    };

    return (
        <div className="h-full overflow-y-auto pt-[72px] pb-24">
            <MenuStrip />

            <div className="mt-3 px-4">
                <button type="button" onClick={() => setMapOpen(true)} className="w-full flex items-center gap-3 rounded-2xl bg-white border border-gray-200 px-4 py-3 text-left hover:bg-sand">
                    <span className="text-2xl" aria-hidden="true">🗺️</span>
                    <span className="min-w-0 mr-auto">
                        <span className="block text-sm font-bold text-ink">Carte du campus</span>
                        <span className="block text-xs text-gray-500">Amphis, administration, banques, commerces… et le chemin pour y aller</span>
                    </span>
                    <span className="text-ochre font-bold" aria-hidden="true">›</span>
                </button>
            </div>

            <div className="mt-4 px-4 flex items-center gap-2">
                <h2 className="text-sm font-bold text-ink mr-auto">📢 Actualités de l’UAC</h2>
                <button type="button" onClick={() => setPublishing(true)} className="flex items-center gap-1.5 rounded-full bg-brand text-ink text-sm font-semibold px-3.5 py-2 hover:bg-brand-hover">
                    <Plus className="w-4 h-4" aria-hidden="true" /> Publier
                </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide" role="group" aria-label="Types d’actualités">
                {[{ slug: 'tout' as const, name: 'Tout', icon: '🗂️' }, ...NEWS_KINDS].map((k) => (
                    <button key={k.slug} type="button" aria-pressed={kind === k.slug} onClick={() => setKind(k.slug)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${kind === k.slug ? 'bg-brand text-ink' : 'bg-white text-gray-700 border border-gray-300'}`}>
                        <span aria-hidden="true">{k.icon}</span> {k.name}
                    </button>
                ))}
            </div>

            <div className="mt-3 px-4 space-y-3">
                {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
                {items.map((n) => (
                    <NewsCard key={n.$id} news={n} canDelete={!!user && (user.$id === n.authorId || !!user.isModerator)} onDelete={remove} />
                ))}
                {!loading && !error && items.length === 0 && (
                    <div className="rounded-2xl bg-white border border-gray-200 p-6 text-center">
                        <p className="text-sm text-gray-600">Aucune actualité pour l’instant.</p>
                        <p className="text-sm text-gray-600 mt-1">Une chambre à louer, un concours, une soutenance, une excursion ? Sois le premier à publier.</p>
                    </div>
                )}
                {loading && <p className="text-center text-sm text-gray-400 py-4">Chargement…</p>}
                {hasMore && !loading && (
                    <button type="button" onClick={() => load(false, items[items.length - 1]?.$id)} className="w-full rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-ink">
                        Voir plus
                    </button>
                )}
            </div>

            {mapOpen && <CampusMap onClose={() => setMapOpen(false)} />}

            {publishing && (
                <PublishNewsSheet defaultKind={kind === 'tout' ? 'autre' : kind} onClose={() => setPublishing(false)} onPublished={(n) => setItems((p) => [n, ...p])} />
            )}
        </div>
    );
};

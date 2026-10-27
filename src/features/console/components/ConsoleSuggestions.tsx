// src/features/console/components/ConsoleSuggestions.tsx — Vanessa
// Propositions libres des utilisateurs. Vanessa ne les lit jamais : l'équipe les
// copie ensuite où elle veut (lexique, connecteur...).
import { useCallback, useEffect, useState } from 'react';
import { communityService, type AdminSuggestion, type SuggestionStatus } from '@/features/community/communityService';

const LABELS: Record<SuggestionStatus, string> = { nouvelle: 'Nouvelle', lue: 'Lue', traitee: 'Traitée' };
const FILTERS: Array<SuggestionStatus | 'toutes'> = ['nouvelle', 'lue', 'traitee', 'toutes'];

export const ConsoleSuggestions = () => {
    const [filter, setFilter] = useState<SuggestionStatus | 'toutes'>('nouvelle');
    const [items, setItems] = useState<AdminSuggestion[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (more = false) => {
        setLoading(true);
        setError(null);
        try {
            const r = await communityService.listSuggestions(filter === 'toutes' ? undefined : filter, more ? items.length : 0);
            setItems((cur) => (more ? [...cur, ...r.suggestions] : r.suggestions));
            setTotal(r.total);
        } catch (err: any) {
            setError(err.message || 'Chargement impossible.');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const setStatus = async (id: string, status: SuggestionStatus) => {
        try {
            await communityService.setSuggestionStatus(id, status);
            setItems((cur) => (filter === 'toutes' ? cur.map((s) => (s.id === id ? { ...s, status } : s)) : cur.filter((s) => s.id !== id)));
        } catch (err: any) {
            setError(err.message || 'Action impossible.');
        }
    };

    const remove = async (id: string) => {
        if (!window.confirm('Supprimer cette proposition ?')) return;
        try {
            await communityService.deleteSuggestion(id);
            setItems((cur) => cur.filter((s) => s.id !== id));
        } catch (err: any) {
            setError(err.message || 'Suppression impossible.');
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${filter === f ? 'bg-brand text-ink' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        {f === 'toutes' ? 'Toutes' : LABELS[f]}
                    </button>
                ))}
            </div>
            <p className="text-xs text-gray-400">Vanessa ne lit pas ces propositions. Copie celles qui sont utiles là où tu veux.</p>
            {error && <p className="text-sm text-red-500">{error}</p>}

            {!loading && items.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400">Aucune proposition ici.</div>
            )}
            {items.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-400 mb-1.5">
                        <span>{s.name || 'Sans nom'} · {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="font-semibold">{LABELS[s.status] ?? s.status}</span>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-line break-words">{s.content}</p>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm">
                        <button onClick={() => navigator.clipboard?.writeText(s.content)} className="font-semibold text-ochre">Copier</button>
                        {s.status !== 'lue' && <button onClick={() => setStatus(s.id, 'lue')} className="text-gray-600">Marquer lue</button>}
                        {s.status !== 'traitee' && <button onClick={() => setStatus(s.id, 'traitee')} className="text-gray-600">Marquer traitée</button>}
                        <button onClick={() => remove(s.id)} className="text-red-500 ml-auto">Supprimer</button>
                    </div>
                </div>
            ))}
            {loading && <p className="text-sm text-gray-400">Chargement...</p>}
            {!loading && items.length < total && (
                <button onClick={() => load(true)} className="text-sm font-semibold text-ochre">Voir plus ({total - items.length})</button>
            )}
        </div>
    );
};

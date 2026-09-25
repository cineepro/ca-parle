// src/features/newsletter/components/RecipientPicker.tsx — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { recipientService, type RecipientUser, type SortOption } from '../services/recipientService';

interface Props {
    selectedIds: Set<string>;
    onChange: (ids: Set<string>) => void;
}

const PAGE_SIZE = 20;

export const RecipientPicker = ({ selectedIds, onChange }: Props) => {
    const [users, setUsers] = useState<RecipientUser[]>([]);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortOption>('recent');
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (offset: number, reset: boolean) => {
        setLoading(true);
        setError(null);
        try {
            const result = await recipientService.list({ search, sort, limit: PAGE_SIZE, offset });
            setTotal(result.total);
            setUsers((prev) => (reset ? result.documents : [...prev, ...result.documents]));
        } catch (err: any) {
            setError(err.message || 'Impossible de charger les utilisateurs (index de tri manquant ?).');
        } finally {
            setLoading(false);
        }
    }, [search, sort]);

    useEffect(() => {
        load(0, true);
    }, [load]);

    const toggle = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange(next);
    };

    const selectAllVisible = () => {
        const next = new Set(selectedIds);
        users.forEach((u) => next.add(u.$id));
        onChange(next);
    };

    const clearSelection = () => onChange(new Set());

    return (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border-b border-gray-200">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher par nom..."
                    className="flex-1 min-w-[140px] rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                />
                <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="rounded-xl border border-gray-200 px-2 py-1.5 text-sm focus:outline-none"
                >
                    <option value="recent">Plus récents</option>
                    <option value="reputation">Plus actifs</option>
                    <option value="name">Nom (A-Z)</option>
                </select>
            </div>

            <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 bg-white border-b border-gray-100">
                <span>{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''} sur {total}</span>
                <div className="flex gap-3">
                    <button type="button" onClick={selectAllVisible} className="text-[#FF4757] font-medium">
                        Tout sélectionner (affichés)
                    </button>
                    <button type="button" onClick={clearSelection} className="text-gray-400">
                        Effacer
                    </button>
                </div>
            </div>

            {error && <p className="text-xs text-red-500 px-3 py-2">{error}</p>}

            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                {users.map((u) => (
                    <label key={u.$id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedIds.has(u.$id)}
                            onChange={() => toggle(u.$id)}
                            className="w-4 h-4 accent-[#FF4757]"
                        />
                        <span className="text-sm text-gray-700 flex-1">{u.name || 'Sans nom'}</span>
                        {u.isBanned && <span className="text-[10px] text-red-400">banni</span>}
                        {u.newsletterOptOut && <span className="text-[10px] text-gray-400">désabonné</span>}
                    </label>
                ))}
                {!loading && users.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">Aucun utilisateur trouvé.</p>
                )}
            </div>

            {users.length < total && (
                <button
                    type="button"
                    onClick={() => load(users.length, false)}
                    disabled={loading}
                    className="w-full text-center text-sm text-[#FF4757] font-medium py-2 hover:bg-gray-50 disabled:opacity-50"
                >
                    {loading ? 'Chargement...' : 'Voir plus'}
                </button>
            )}
        </div>
    );
};

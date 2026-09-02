// src/features/references/components/ReferenceTagInput.tsx — Ça Parle
// Utilisé dans le formulaire de création d'histoire : permet de rattacher
// l'histoire à une ou plusieurs fiches (personnes, événements...). Si le
// nom tapé ne correspond à rien d'existant, une nouvelle fiche est créée
// à la volée (findOrCreate).
import { useState } from 'react';
import { useReferenceSearch } from '../hooks/useReferenceSearch';
import { referenceService, type Reference, type ReferenceType } from '../services/referenceService';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface Props {
    selected: Reference[];
    onChange: (refs: Reference[]) => void;
}

const TYPE_ICON: Record<ReferenceType, string> = {
    personne: '👤', evenement: '📅', lieu: '📍', entreprise: '🏢', sujet: '🏷️',
};

export const ReferenceTagInput = ({ selected, onChange }: Props) => {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const { results, loading } = useReferenceSearch(query);

    const isAlreadySelected = (id: string) => selected.some((r) => r.$id === id);

    const addReference = (ref: Reference) => {
        if (!isAlreadySelected(ref.$id)) onChange([...selected, ref]);
        setQuery('');
    };

    const removeReference = (id: string) => {
        onChange(selected.filter((r) => r.$id !== id));
    };

    const handleCreateNew = async () => {
        if (!query.trim() || creating) return;
        setCreating(true);
        try {
            const ref = await referenceService.findOrCreate(query.trim(), 'personne', user?.$id);
            addReference(ref);
        } finally {
            setCreating(false);
        }
    };

    const exactMatchExists = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Personnes / sujets concernés (optionnel)
            </label>

            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {selected.map((ref) => (
                        <span
                            key={ref.$id}
                            className="inline-flex items-center gap-1 bg-[#FF4757]/5 text-[#FF4757] rounded-full px-2.5 py-1 text-xs font-medium"
                        >
                            {TYPE_ICON[ref.type]} {ref.name}
                            <button type="button" onClick={() => removeReference(ref.$id)} className="ml-1 hover:text-red-700">✕</button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher ou créer une fiche (ex: Davido)..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                />

                {query.trim() && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-md max-h-52 overflow-y-auto">
                        {loading && <p className="px-3 py-2 text-xs text-gray-400">Recherche...</p>}

                        {!loading && results.map((ref) => (
                            <button
                                key={ref.$id}
                                type="button"
                                onClick={() => addReference(ref)}
                                disabled={isAlreadySelected(ref.$id)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-40"
                            >
                                {TYPE_ICON[ref.type]} {ref.name}
                                <span className="text-xs text-gray-400 ml-auto">{ref.storiesCount} histoires</span>
                            </button>
                        ))}

                        {!loading && !exactMatchExists && (
                            <button
                                type="button"
                                onClick={handleCreateNew}
                                disabled={creating}
                                className="w-full text-left px-3 py-2 text-sm text-[#FF4757] font-medium hover:bg-gray-50 border-t border-gray-50"
                            >
                                {creating ? 'Création...' : `+ Créer la fiche "${query.trim()}"`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

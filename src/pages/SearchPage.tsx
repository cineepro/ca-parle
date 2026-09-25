// src/pages/SearchPage.tsx — Vanessa
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { globalSearchService, type GlobalSearchResults } from '@/features/search/services/globalSearchService';
import { StoryCard } from '@/features/stories/components/StoryCard';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GlobalSearchResults | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query.trim()) {
            setResults(null);
            return;
        }
        setLoading(true);
        const timeout = setTimeout(async () => {
            try {
                const res = await globalSearchService.search(query);
                setResults(res);
            } finally {
                setLoading(false);
            }
        }, 350);
        return () => clearTimeout(timeout);
    }, [query]);

    const hasAnyResult = results && (results.stories.length > 0 || results.references.length > 0 || results.users.length > 0);

    return (
        <div className="px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-5">
                <h1 className="text-xl font-bold text-gray-800">🔎 Recherche</h1>

                <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher une histoire, une personne, un utilisateur..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                />

                {loading && <p className="text-sm text-gray-400 text-center py-6">Recherche...</p>}

                {!loading && query.trim() && results && !hasAnyResult && (
                    <p className="text-sm text-gray-400 text-center py-6">Aucun résultat pour "{query}".</p>
                )}

                {!loading && results && results.stories.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Histoires</h2>
                        <div className="space-y-3">
                            {results.stories.map((story) => (
                                <StoryCard key={story.$id} story={story} />
                            ))}
                        </div>
                    </div>
                )}

                {!loading && results && results.references.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Fiches références</h2>
                        <div className="bg-white rounded-2xl divide-y divide-gray-50 overflow-hidden">
                            {results.references.map((ref) => (
                                <Link
                                    key={ref.$id}
                                    to={`/reference/${ref.slug}`}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                                >
                                    <span className="text-sm text-gray-700">{ref.name}</span>
                                    <span className="text-xs text-gray-400">{ref.storiesCount} histoires</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {!loading && results && results.users.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Utilisateurs</h2>
                        <div className="bg-white rounded-2xl divide-y divide-gray-50 overflow-hidden">
                            {results.users.map((u) => (
                                <div key={u.$id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="w-8 h-8 rounded-full bg-[#FF4757]/10 text-[#FF4757] flex items-center justify-center font-bold text-xs">
                                        {u.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="text-sm text-gray-700">{u.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

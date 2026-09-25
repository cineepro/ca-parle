// src/pages/MyReferencesPage.tsx — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { followService } from '@/features/follow/services/followService';
import { referenceService, type Reference } from '@/features/references/services/referenceService';
import { useReferenceSearch } from '@/features/references/hooks/useReferenceSearch';
import { FollowButton } from '@/features/follow/components/FollowButton';

const TYPE_ICON: Record<string, string> = {
    personne: '👤', evenement: '📅', lieu: '📍', entreprise: '🏢', sujet: '🏷️',
};

export default function MyReferencesPage() {
    const { user } = useAuth();
    const [followed, setFollowed] = useState<Reference[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { results, loading: searching } = useReferenceSearch(search);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const follows = await followService.getFollowing(user.$id, 'reference');
            const refs = await Promise.allSettled(follows.map((f) => referenceService.getById(f.followingId)));
            setFollowed(
                refs
                    .filter((r): r is PromiseFulfilledResult<Reference> => r.status === 'fulfilled')
                    .map((r) => r.value)
            );
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        load();
    }, [load]);

    // Résultats de recherche déjà suivis à exclure de la liste "à suivre".
    const followedIds = new Set(followed.map((r) => r.$id));
    const searchResultsToShow = results.filter((r) => !followedIds.has(r.$id));

    return (
        <div className="px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-5">
                <div className="flex items-center gap-3">
                    <Link to="/profil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-xl font-bold text-gray-800">🔎 Mes références</h1>
                </div>

                {/* Recherche pour suivre de nouvelles fiches */}
                <div>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher une personne, un sujet à suivre..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                    />
                    {search.trim() && (
                        <div className="mt-2 bg-white rounded-2xl divide-y divide-gray-50 overflow-hidden">
                            {searching && <p className="text-xs text-gray-400 px-4 py-3">Recherche...</p>}
                            {!searching && searchResultsToShow.length === 0 && (
                                <p className="text-xs text-gray-400 px-4 py-3">Aucun résultat.</p>
                            )}
                            {searchResultsToShow.map((ref) => (
                                <div key={ref.$id} className="flex items-center justify-between px-4 py-3">
                                    <Link to={`/reference/${ref.slug}`} className="text-sm text-gray-700 hover:underline">
                                        {TYPE_ICON[ref.type]} {ref.name}
                                    </Link>
                                    <FollowButton followingId={ref.$id} followingType="reference" initialCount={ref.followersCount} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Références déjà suivies */}
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        Suivies ({followed.length})
                    </h2>
                    {loading ? (
                        <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                    ) : followed.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
                            <div className="text-3xl mb-2">🔎</div>
                            <p className="text-sm">Tu ne suis encore aucune fiche.</p>
                            <p className="text-sm">Cherche une personne ou un sujet ci-dessus.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl divide-y divide-gray-50 overflow-hidden">
                            {followed.map((ref) => (
                                <Link
                                    key={ref.$id}
                                    to={`/reference/${ref.slug}`}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                                >
                                    <span className="text-sm text-gray-700">
                                        {TYPE_ICON[ref.type]} {ref.name}
                                    </span>
                                    <span className="text-xs text-gray-400">{ref.storiesCount} histoires</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

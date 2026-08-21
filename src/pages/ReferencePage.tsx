// src/pages/ReferencePage.tsx — Ça Parle
import { useParams, Link } from 'react-router-dom';
import { useReference } from '@/features/references/hooks/useReference';
import { StoryCard } from '@/features/stories/components/StoryCard';
import { FollowButton } from '@/features/follow/components/FollowButton';

const TYPE_LABEL: Record<string, string> = {
    personne: 'Personne', evenement: 'Événement', lieu: 'Lieu', entreprise: 'Entreprise', sujet: 'Sujet',
};

export default function ReferencePage() {
    const { slug } = useParams<{ slug: string }>();
    const { reference, stories, loading, error } = useReference(slug);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <svg className="animate-spin w-8 h-8 text-[#FF4757]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
            </div>
        );
    }

    if (error || !reference) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-3">
                <p className="text-gray-500">{error}</p>
                <Link to="/accueil" className="text-[#FF4757] font-semibold hover:underline">Retour au fil</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link to="/accueil" className="text-gray-400 hover:text-gray-600 text-sm">← Retour au fil</Link>

                <div className="bg-white rounded-3xl p-6 space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="inline-block bg-gray-100 text-gray-500 rounded-full px-2.5 py-0.5 text-xs font-medium mb-2">
                                {TYPE_LABEL[reference.type] || reference.type}
                            </span>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                {reference.name}
                                {reference.isVerifiedEntity && <span title="Fiche vérifiée">✅</span>}
                            </h1>
                        </div>
                    </div>

                    {reference.description && (
                        <p className="text-sm text-gray-500 leading-relaxed">{reference.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-4 text-sm text-gray-400">
                            <span>📚 {reference.storiesCount} histoires</span>
                        </div>
                        <FollowButton followingId={reference.$id} followingType="reference" initialCount={reference.followersCount} />
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-700 px-1">
                        {stories.length} histoire{stories.length > 1 ? 's' : ''} associée{stories.length > 1 ? 's' : ''}
                    </h2>

                    {stories.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">
                            Rien ne se raconte encore sur {reference.name}.
                        </p>
                    ) : (
                        stories.map((story) => <StoryCard key={story.$id} story={story} />)
                    )}
                </div>
            </div>
        </div>
    );
}
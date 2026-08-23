// src/pages/StoryDetailPage.tsx — Ça Parle
// Affiche déjà le contenu complet de l'histoire. Les réactions, votes
// "Tu y crois ?", commentaires et chronologie seront branchés à l'étape
// suivante (features reactions/comments/predictions).
import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { storyService, type Story } from '@/features/stories/services/storyService';
import { StoryTypeBadge } from '@/features/stories/components/StoryTypeBadge';
import { StoryStatusBadge } from '@/features/stories/components/StoryStatusBadge';
import { ReactionBar } from '@/features/reactions/components/ReactionBar';
import { CommentThread } from '@/features/comments/components/CommentThread';
import { usePredictions } from '@/features/predictions/hooks/usePredictions';
import { PredictionCard } from '@/features/predictions/components/PredictionCard';
import { CreatePredictionForm } from '@/features/predictions/components/CreatePredictionForm';
import { StoryTimeline } from '@/features/story-updates/components/StoryTimeline';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { storyReferenceService } from '@/features/references/services/storyReferenceService';
import { ReferenceChip } from '@/features/references/components/ReferenceChip';
import type { Reference } from '@/features/references/services/referenceService';
import { ReportButton } from '@/features/moderation/components/ReportButton';
import { ShareButton } from '@/features/stories/components/ShareButton';
import { conversationService } from '@/features/messaging/services/conversationService';

export default function StoryDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [story, setStory] = useState<Story | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [references, setReferences] = useState<Reference[]>([]);
    const [startingChat, setStartingChat] = useState(false);
    const viewCounted = useRef(false);

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            setLoading(true);
            try {
                const result = await storyService.getStoryById(id);
                setStory(result);

                storyReferenceService.getReferencesForStory(id).then(setReferences);

                if (!viewCounted.current) {
                    viewCounted.current = true;
                    storyService.incrementView(id);
                }
            } catch {
                setError('Cette histoire est introuvable.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id]);

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

    if (error || !story) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-3">
                <p className="text-gray-500">{error}</p>
                <Link to="/accueil" className="text-[#FF4757] font-semibold hover:underline">Retour au fil</Link>
            </div>
        );
    }

    const canMessageAuthor = user && !story.isAnonymous && story.authorId !== user.$id;

    const handleMessageAuthor = async () => {
        if (!user || startingChat) return;
        setStartingChat(true);
        try {
            const conversation = await conversationService.findOrCreateDirect(user.$id, story.authorId);
            navigate(`/messages/${conversation.$id}`);
        } finally {
            setStartingChat(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link to="/accueil" className="text-gray-400 hover:text-gray-600 text-sm">← Retour au fil</Link>

                <div className="bg-white rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <StoryTypeBadge type={story.type} />
                        <div className="flex items-center gap-3">
                            <StoryStatusBadge status={story.status} />
                            <ReportButton targetType="story" targetId={story.$id} />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-800 mb-2 leading-snug">{story.title}</h1>

                    <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                        {story.isAnonymous ? '🕵️ Publié anonymement' : `Par ${story.authorName || 'Utilisateur'}`}
                        {canMessageAuthor && (
                            <button
                                type="button"
                                onClick={handleMessageAuthor}
                                disabled={startingChat}
                                className="text-[#FF4757] font-medium hover:underline disabled:opacity-50"
                            >
                                {startingChat ? 'Ouverture...' : '✉️ Message'}
                            </button>
                        )}
                    </p>

                    {references.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {references.map((ref) => <ReferenceChip key={ref.$id} reference={ref} />)}
                        </div>
                    )}

                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{story.content}</p>

                    <div className="flex items-center gap-4 mt-6 mb-4 text-sm text-gray-400">
                        <span>👀 {story.viewCount} vues</span>
                        <span className="ml-auto">
                            <ShareButton storyId={story.$id} title={story.title} />
                        </span>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <ReactionBar targetType="story" targetId={story.$id} initialCount={story.reactionsCount} />
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6">
                    <PredictionsSection storyId={story.$id} isStoryAuthor={user?.$id === story.authorId} />
                </div>

                <div className="bg-white rounded-3xl p-6">
                    <StoryTimeline storyId={story.$id} isStoryAuthor={user?.$id === story.authorId} />
                </div>

                <div className="bg-white rounded-3xl p-6">
                    <CommentThread storyId={story.$id} />
                </div>
            </div>
        </div>
    );
}

function PredictionsSection({ storyId, isStoryAuthor }: { storyId: string; isStoryAuthor: boolean }) {
    const { predictions, createPrediction } = usePredictions(storyId);

    return (
        <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700">🔮 Prédictions</h2>

            {predictions.length === 0 && (
                <p className="text-sm text-gray-400">Aucune prédiction lancée sur cette histoire.</p>
            )}

            {predictions.map((prediction) => (
                <PredictionCard key={prediction.$id} prediction={prediction} isStoryAuthor={isStoryAuthor} />
            ))}

            {isStoryAuthor && <CreatePredictionForm onSubmit={createPrediction} />}
        </div>
    );
}
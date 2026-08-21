// src/pages/TrendingPage.tsx — Ça Parle
import { Link } from 'react-router-dom';
import { useTrendingStories } from '@/features/stories/hooks/useTrendingStories';
import { StoryCard } from '@/features/stories/components/StoryCard';

export default function TrendingPage() {
    const { stories, loading, error } = useTrendingStories();

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8 pb-24">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link to="/accueil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-xl font-bold text-gray-800">⭐ Tendances</h1>
                </div>
                <p className="text-sm text-gray-400 px-1">Les histoires qui font le plus réagir en ce moment.</p>

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                ) : error ? (
                    <p className="text-sm text-red-500 text-center py-8">{error}</p>
                ) : stories.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Rien ne tend encore. Sois le premier à faire réagir !</p>
                ) : (
                    <div className="space-y-3">
                        {stories.map((story, index) => (
                            <div key={story.$id} className="relative">
                                {index < 3 && (
                                    <span className="absolute -left-2 -top-2 z-10 bg-[#FF4757] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                        {index + 1}
                                    </span>
                                )}
                                <StoryCard story={story} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
// src/features/stories/components/StoryFeed.tsx — Ça Parle
import { useStoryFeed } from '../hooks/useStoryFeed';
import { StoryCard } from './StoryCard';
import { Button } from '@/components/ui/button';

export const StoryFeed = ({ categorySlug }: { categorySlug: string }) => {
    const { stories, loading, loadingMore, hasMore, error, loadMore } = useStoryFeed(categorySlug);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <svg className="animate-spin w-6 h-6 text-[#FF4757]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
            </div>
        );
    }

    if (error) {
        return <p className="text-center text-sm text-red-500 py-8">{error}</p>;
    }

    if (stories.length === 0) {
        return (
            <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">🤫</div>
                <p className="text-sm">Rien ne se raconte encore dans cette catégorie.</p>
                <p className="text-sm">Sois le premier à lancer une histoire !</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {stories.map((story) => (
                <StoryCard key={story.$id} story={story} />
            ))}

            {hasMore && (
                <div className="flex justify-center pt-2">
                    <Button variant="secondary" onClick={loadMore} isLoading={loadingMore}>
                        Voir plus
                    </Button>
                </div>
            )}
        </div>
    );
};
// src/features/stories/components/StoryCard.tsx — Vanessa
import { Link } from 'react-router-dom';
import type { Story } from '../services/storyService';
import { StoryTypeBadge } from './StoryTypeBadge';
import { StoryStatusBadge } from './StoryStatusBadge';
import { ShareButton } from './ShareButton';
import { VANESSA_USER_ID } from '@/api/constants';
import { getStoryImageUrl } from '../services/storyService';
import { Eye, EyeOff, Flame, MessageCircle, Pin, Sparkles } from 'lucide-react';

const timeAgo = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    return `${days} j`;
};

export const StoryCard = ({ story }: { story: Story }) => {
    const excerpt = story.content.length > 180 ? `${story.content.slice(0, 180)}…` : story.content;

    return (
        <Link
            to={`/histoire/${story.$id}`}
            className="block bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-200"
        >
            <div className="flex items-center justify-between mb-2">
                <StoryTypeBadge type={story.type} />
                {story.isPinned && <span className="text-xs text-ochre font-semibold"><Pin className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> À la une</span>}
            </div>

            <h3 className="text-xl font-semibold text-ink mb-1.5 leading-snug">{story.title}</h3>

            {story.coverImageId && (
                <img
                    src={getStoryImageUrl(story.coverImageId)}
                    alt=""
                    className="w-full max-h-80 object-contain bg-gray-50 rounded-xl mb-3"
                    loading="lazy"
                />
            )}

            <p className="text-base text-gray-700 leading-relaxed mb-3">{excerpt}</p>

            <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-3">
                    <span>
                        {story.isAnonymous ? <><EyeOff className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1 shrink-0" aria-hidden="true" />Anonyme</> : story.authorName || 'Utilisateur'}
                        {story.authorId === VANESSA_USER_ID && <span className="ml-1 text-ochre"><Sparkles className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> IA</span>}
                    </span>
                    <span>·</span>
                    <span>{timeAgo(story.$createdAt)}</span>
                </div>
                <StoryStatusBadge status={story.status} />
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                <span><Eye className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> {story.viewCount}</span>
                <span><Flame className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> {story.reactionsCount}</span>
                <span><MessageCircle className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> {story.commentsCount}</span>
                <span className="ml-auto">
                    <ShareButton storyId={story.$id} title={story.title} />
                </span>
            </div>
        </Link>
    );
};

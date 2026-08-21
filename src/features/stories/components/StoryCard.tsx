// src/features/stories/components/StoryCard.tsx — Ça Parle
import { Link } from 'react-router-dom';
import type { Story } from '../services/storyService';
import { StoryTypeBadge } from './StoryTypeBadge';
import { StoryStatusBadge } from './StoryStatusBadge';

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
            className="block bg-white rounded-2xl p-5 hover:shadow-md transition-shadow border border-gray-100"
        >
            <div className="flex items-center justify-between mb-2">
                <StoryTypeBadge type={story.type} />
                {story.isPinned && <span className="text-xs text-[#FF4757] font-semibold">📌 À la une</span>}
            </div>

            <h3 className="text-base font-bold text-gray-800 mb-1.5 leading-snug">{story.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">{excerpt}</p>

            <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-3">
                    <span>{story.isAnonymous ? '🕵️ Anonyme' : story.authorName || 'Utilisateur'}</span>
                    <span>·</span>
                    <span>{timeAgo(story.$createdAt)}</span>
                </div>
                <StoryStatusBadge status={story.status} />
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                <span>👀 {story.viewCount}</span>
                <span>🔥 {story.reactionsCount}</span>
                <span>💬 {story.commentsCount}</span>
            </div>
        </Link>
    );
};
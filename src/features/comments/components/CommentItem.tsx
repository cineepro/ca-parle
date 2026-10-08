// src/features/comments/components/CommentItem.tsx — Vanessa
import { useState } from 'react';
import type { Comment } from '../services/commentService';
import { commentService } from '../services/commentService';
import { ReportButton } from '@/features/moderation/components/ReportButton';
import { Flag, MessageCircle, MessageSquare, ThumbsUp, Zap, type LucideIcon } from 'lucide-react';

const TYPE_LABEL: Record<string, { Icon: LucideIcon; className: string }> = {
    commentaire: { Icon: MessageCircle, className: 'text-gray-500' },
    temoignage: { Icon: MessageSquare, className: 'text-brun' },
    revelation: { Icon: Zap, className: 'text-amber-600' },
};

const timeAgo = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} j`;
};

interface Props {
    comment: Comment;
    onReply?: () => void;
    isReply?: boolean;
}

export const CommentItem = ({ comment, onReply, isReply = false }: Props) => {
    const [likes, setLikes] = useState(comment.likesCount);
    const [liked, setLiked] = useState(false);
    const typeInfo = TYPE_LABEL[comment.type] || TYPE_LABEL.commentaire;

    const handleLike = async () => {
        if (liked) return;
        setLiked(true);
        setLikes((l) => l + 1);
        try {
            await commentService.like(comment.$id, comment.likesCount);
        } catch {
            setLiked(false);
            setLikes((l) => l - 1);
        }
    };

    return (
        <div className={isReply ? 'ml-8 pl-3 border-l-2 border-gray-100' : ''}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className={`font-medium ${typeInfo.className}`}><typeInfo.Icon className="w-4 h-4" aria-hidden="true" /></span>
                    <span className="font-medium text-gray-600">
                        {comment.isAnonymous ? 'Anonyme' : comment.authorName || 'Utilisateur'}
                    </span>
                    <span>·</span>
                    <span>{timeAgo(comment.$createdAt)}</span>
                </div>
            </div>
            <p className="text-sm text-gray-700 mt-1 leading-relaxed">{comment.content}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                <button
                    onClick={handleLike}
                    disabled={liked}
                    className={`hover:text-ochre transition-colors ${liked ? 'text-ochre' : ''}`}
                >
                    <ThumbsUp className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> {likes > 0 ? likes : ''}
                </button>
                {!isReply && onReply && (
                    <button onClick={onReply} className="hover:text-gray-600 transition-colors">
                        Répondre
                    </button>
                )}
                <ReportButton targetType="comment" targetId={comment.$id} label={<Flag className="w-4 h-4" aria-hidden="true" />} />
            </div>
        </div>
    );
};

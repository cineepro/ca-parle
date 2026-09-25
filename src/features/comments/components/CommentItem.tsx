// src/features/comments/components/CommentItem.tsx — Vanessa
import { useState } from 'react';
import type { Comment } from '../services/commentService';
import { commentService } from '../services/commentService';
import { ReportButton } from '@/features/moderation/components/ReportButton';

const TYPE_LABEL: Record<string, { icon: string; className: string }> = {
    commentaire: { icon: '💬', className: 'text-gray-400' },
    temoignage: { icon: '🗣️', className: 'text-blue-500' },
    revelation: { icon: '💥', className: 'text-orange-500' },
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
                    <span className={`font-medium ${typeInfo.className}`}>{typeInfo.icon}</span>
                    <span className="font-medium text-gray-600">
                        {comment.isAnonymous ? '🕵️ Anonyme' : comment.authorName || 'Utilisateur'}
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
                    className={`hover:text-[#FF4757] transition-colors ${liked ? 'text-[#FF4757]' : ''}`}
                >
                    👍 {likes > 0 ? likes : ''}
                </button>
                {!isReply && onReply && (
                    <button onClick={onReply} className="hover:text-gray-600 transition-colors">
                        Répondre
                    </button>
                )}
                <ReportButton targetType="comment" targetId={comment.$id} label="🚩" />
            </div>
        </div>
    );
};

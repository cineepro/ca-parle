// src/features/comments/components/CommentThread.tsx — Ça Parle
import { useState } from 'react';
import { useComments } from '../hooks/useComments';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import type { CommentType } from '../services/commentService';

interface Props {
    storyId: string;
    storyCommentsCount: number;
    storyAuthorId: string;
    storyTitle: string;
}

export const CommentThread = ({ storyId, storyCommentsCount, storyAuthorId, storyTitle }: Props) => {
    const { topLevel, repliesByParent, loading, posting, error, postComment } = useComments(
        storyId,
        storyCommentsCount,
        { storyAuthorId, storyTitle }
    );
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    const handleMainSubmit = (content: string, type: CommentType, isAnonymous: boolean) => {
        postComment(content, type, isAnonymous);
    };

    const handleReplySubmit = (parentId: string) => (content: string, type: CommentType, isAnonymous: boolean) => {
        postComment(content, type, isAnonymous, parentId);
        setReplyingTo(null);
    };

    return (
        <div className="space-y-5">
            <h2 className="text-sm font-bold text-gray-700">
                💬 {topLevel.length + Object.values(repliesByParent).flat().length} commentaires
            </h2>

            <CommentForm onSubmit={handleMainSubmit} posting={posting} />

            {error && <p className="text-xs text-red-500">{error}</p>}

            {loading ? (
                <p className="text-sm text-gray-400 text-center py-4">Chargement...</p>
            ) : topLevel.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                    Aucun commentaire pour l'instant. Lance la discussion !
                </p>
            ) : (
                <div className="space-y-4">
                    {topLevel.map((comment) => (
                        <div key={comment.$id} className="space-y-3">
                            <CommentItem
                                comment={comment}
                                onReply={() => setReplyingTo(replyingTo === comment.$id ? null : comment.$id)}
                            />

                            {replyingTo === comment.$id && (
                                <div className="ml-8">
                                    <CommentForm
                                        onSubmit={handleReplySubmit(comment.$id)}
                                        posting={posting}
                                        placeholder="Répondre..."
                                        compact
                                    />
                                </div>
                            )}

                            {(repliesByParent[comment.$id] || []).map((reply) => (
                                <CommentItem key={reply.$id} comment={reply} isReply />
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
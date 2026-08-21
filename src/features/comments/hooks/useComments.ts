// src/features/comments/hooks/useComments.ts — Ça Parle
import { useState, useEffect, useCallback } from 'react';
import { commentService, type Comment, type CommentType } from '../services/commentService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { reputationService } from '@/features/reputation/services/reputationService';
import { refreshReputation } from '@/features/reputation/hooks/useReputation';
import { notificationService } from '@/features/notifications/services/notificationService';

interface StoryContext {
    storyAuthorId: string;
    storyTitle: string;
}

export const useComments = (storyId: string, storyCommentsCount: number, storyContext?: StoryContext) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await commentService.getByStory(storyId);
            setComments(list);
        } catch {
            setError('Impossible de charger les commentaires.');
        } finally {
            setLoading(false);
        }
    }, [storyId]);

    useEffect(() => {
        load();
    }, [load]);

    const postComment = async (content: string, type: CommentType, isAnonymous: boolean, parentCommentId?: string) => {
        if (!user) {
            setError('Connecte-toi pour participer.');
            return;
        }
        if (!content.trim()) return;

        setPosting(true);
        setError(null);
        try {
            const newComment = await commentService.create({
                storyId,
                authorId: user.$id,
                authorName: user.name,
                isAnonymous,
                content,
                type,
                parentCommentId,
            });
            await load();

            // Compteur dénormalisé sur la story (best-effort).
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.STORIES, storyId, {
                    commentsCount: storyCommentsCount + 1,
                });
            } catch { /* non bloquant */ }

            // Compteurs de réputation de l'auteur du commentaire.
            reputationService.incrementCounter(user.$id, 'commentsCount').then(() => {
                if (type === 'revelation') {
                    reputationService.incrementCounter(user.$id, 'revelationsCount').then(() => refreshReputation(user.$id));
                } else {
                    refreshReputation(user.$id);
                }
            });

            // Notifications : réponse à un commentaire OU nouveau commentaire
            // sur l'histoire (pas les deux, pour éviter de spammer l'auteur
            // de l'histoire quand quelqu'un répond à un fil de discussion).
            if (parentCommentId) {
                commentService.getById(parentCommentId).then((parent) => {
                    notificationService.notifyIfNotSelf(user.$id, parent.authorId, {
                        title: '💬 Nouvelle réponse',
                        message: `${user.name} a répondu à ton commentaire.`,
                        url: `/histoire/${storyId}`,
                    });
                }).catch(() => {});
            } else if (storyContext) {
                notificationService.notifyIfNotSelf(user.$id, storyContext.storyAuthorId, {
                    title: '💬 Nouveau commentaire',
                    message: `${user.name} a commenté « ${storyContext.storyTitle} ».`,
                    url: `/histoire/${storyId}`,
                });
            }
        } catch {
            setError("Impossible d'envoyer ton message, réessaie.");
        } finally {
            setPosting(false);
        }
    };

    // Organisation en threads : top-level puis réponses groupées par parent.
    const topLevel = comments.filter((c) => !c.parentCommentId);
    const repliesByParent = comments.reduce<Record<string, Comment[]>>((acc, c) => {
        if (c.parentCommentId) {
            acc[c.parentCommentId] = acc[c.parentCommentId] || [];
            acc[c.parentCommentId].push(c);
        }
        return acc;
    }, {});

    return { comments, topLevel, repliesByParent, loading, posting, error, postComment, refresh: load };
};
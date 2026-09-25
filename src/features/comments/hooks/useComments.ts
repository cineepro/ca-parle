// src/features/comments/hooks/useComments.ts — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { commentService, type Comment, type CommentType } from '../services/commentService';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const useComments = (storyId: string) => {
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
            await commentService.create({
                storyId,
                authorId: user.$id,
                authorName: user.name,
                isAnonymous,
                content,
                type,
                parentCommentId,
            });
            await load();

            // Compteur commentsCount de la story, réputation/badges de
            // l'auteur, et notifications (réponse ou commentaire sur
            // l'histoire) sont désormais gérés automatiquement côté serveur
            // par la Function `on-comment-created`.
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

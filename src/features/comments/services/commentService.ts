// src/features/comments/services/commentService.ts — Vanessa
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export type CommentType = 'commentaire' | 'temoignage' | 'revelation';
export type ModerationStatus = 'visible' | 'masque' | 'supprime';

export interface Comment extends Models.Document {
    storyId: string;
    parentCommentId?: string;
    authorId: string;
    authorName?: string;
    isAnonymous: boolean;
    content: string;
    type: CommentType;
    likesCount: number;
    moderationStatus: ModerationStatus;
    createdAt: string;
}

export const commentService = {
    async create(data: {
        storyId: string;
        authorId: string;
        authorName?: string;
        isAnonymous: boolean;
        content: string;
        type: CommentType;
        parentCommentId?: string;
    }): Promise<Comment> {
        return await databases.createDocument<Comment>(
            DATABASE_ID,
            COLLECTIONS.COMMENTS,
            ID.unique(),
            {
                storyId: data.storyId,
                parentCommentId: data.parentCommentId || '',
                authorId: data.authorId,
                authorName: data.isAnonymous ? '' : (data.authorName || ''),
                isAnonymous: data.isAnonymous,
                content: data.content,
                type: data.type,
                likesCount: 0,
                moderationStatus: 'visible',
                createdAt: new Date().toISOString(),
            }
        );
    },

    async getByStory(storyId: string, limit = 200): Promise<Comment[]> {
        const result = await databases.listDocuments<Comment>(DATABASE_ID, COLLECTIONS.COMMENTS, [
            Query.equal('storyId', storyId),
            Query.equal('moderationStatus', 'visible'),
            Query.orderAsc('createdAt'),
            Query.limit(limit),
        ]);
        return result.documents;
    },

    async getById(commentId: string): Promise<Comment> {
        return await databases.getDocument<Comment>(DATABASE_ID, COLLECTIONS.COMMENTS, commentId);
    },

    // Pas de collection dédiée aux likes pour l'instant (MVP) : on
    // incrémente directement. Limite connue : un utilisateur peut liker
    // plusieurs fois en rechargeant. À corriger via une collection
    // `comment_likes` + contrainte unique si ça devient un problème réel.
    async like(commentId: string, currentLikes: number): Promise<void> {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.COMMENTS, commentId, {
            likesCount: currentLikes + 1,
        });
    },
};

// src/features/stories/services/storyService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';
import { slugify } from '@/utils/slugify';

export type StoryType = 'ragot' | 'revelation' | 'temoignage' | 'reaction' | 'rumeur' | 'confirme';
export type StoryStatus = 'rumeur' | 'en_verification' | 'confirme' | 'dementi';
export type ModerationStatus = 'visible' | 'masque' | 'supprime';

export interface Story extends Models.Document {
    title: string;
    slug: string;
    content: string;
    type: StoryType;
    status: StoryStatus;
    categoryId: string;
    authorId: string;
    authorName?: string;
    isAnonymous: boolean;
    coverImageId?: string;
    viewCount: number;
    reactionsCount: number;
    commentsCount: number;
    trendingScore: number;
    isPinned: boolean;
    moderationStatus: ModerationStatus;
    referenceIds?: string[];
    createdAt: string;
    updatedAt?: string;
}

export interface CreateStoryInput {
    title: string;
    content: string;
    type: StoryType;
    categoryId: string;
    isAnonymous: boolean;
    authorId: string;
    authorName?: string;
    referenceIds?: string[];
}

export const storyService = {
    async createStory(data: CreateStoryInput): Promise<Story> {
        const story = await databases.createDocument<Story>(
            DATABASE_ID,
            COLLECTIONS.STORIES,
            ID.unique(),
            {
                title: data.title,
                slug: slugify(data.title),
                content: data.content,
                type: data.type,
                status: 'rumeur',
                categoryId: data.categoryId,
                authorId: data.authorId,
                authorName: data.isAnonymous ? '' : (data.authorName || ''),
                isAnonymous: data.isAnonymous,
                viewCount: 0,
                reactionsCount: 0,
                commentsCount: 0,
                trendingScore: 0,
                isPinned: false,
                moderationStatus: 'visible',
                referenceIds: data.referenceIds || [],
                createdAt: new Date().toISOString(),
            }
        );

        if (data.referenceIds && data.referenceIds.length > 0) {
            const { storyReferenceService } = await import('@/features/references/services/storyReferenceService');
            await storyReferenceService.linkMany(story.$id, data.referenceIds);
        }

        return story;
    },

    // Feed paginé par curseur, avec filtre catégorie optionnel.
    async getFeed(options: {
        limit?: number;
        cursor?: string;
        categorySlug?: string;
    } = {}) {
        const { limit = 20, cursor, categorySlug } = options;

        const queries = [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('$createdAt'),
            Query.limit(limit),
        ];

        if (categorySlug && categorySlug !== 'tout') {
            queries.push(Query.equal('categoryId', categorySlug));
        }
        if (cursor) {
            queries.push(Query.cursorAfter(cursor));
        }

        return await databases.listDocuments<Story>(DATABASE_ID, COLLECTIONS.STORIES, queries);
    },

    async getTrending(limit = 10) {
        return await databases.listDocuments<Story>(DATABASE_ID, COLLECTIONS.STORIES, [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('trendingScore'),
            Query.limit(limit),
        ]);
    },

    // ➕ AJOUTER CETTE MÉTHODE ICI :
    async getMostReacted(limit = 30) {
        return await databases.listDocuments<Story>(DATABASE_ID, COLLECTIONS.STORIES, [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('reactionsCount'),
            Query.limit(limit),
        ]);
    },

    async getStoryById(storyId: string) {
        return await databases.getDocument<Story>(DATABASE_ID, COLLECTIONS.STORIES, storyId);
    },

    async getByAuthor(authorId: string, limit = 20) {
        return await databases.listDocuments<Story>(DATABASE_ID, COLLECTIONS.STORIES, [
            Query.equal('authorId', authorId),
            Query.orderDesc('$createdAt'),
            Query.limit(limit),
        ]);
    },

    // Le viewCount est désormais incrémenté côté serveur par la Function
    // `increment-view`, qui calcule le +1 à partir de la valeur réellement
    // stockée — impossible d'envoyer une valeur falsifiée comme avec
    // l'ancienne écriture directe client.
    async incrementView(storyId: string): Promise<void> {
        try {
            const { callFunction } = await import('@/api/functionsClient');
            const { FUNCTIONS } = await import('@/api/constants');
            await callFunction(FUNCTIONS.INCREMENT_VIEW, { storyId });
        } catch {
            // Non bloquant — une vue ratée n'est pas grave.
        }
    },
};
// src/features/stories/services/storyService.ts — Ça Parle
import { databases, storage } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { BUCKETS } from '@/api/constants';
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
    country?: string;
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
    country?: string;
    isAnonymous: boolean;
    authorId: string;
    authorName?: string;
    referenceIds?: string[];
    coverImageId?: string;
}

// Construit l'URL d'affichage d'une image stockée dans le bucket
// story-images à partir de son ID de fichier.
export function getStoryImageUrl(fileId: string): string {
    return storage.getFileView(BUCKETS.STORY_IMAGES, fileId).toString();
}

// Upload direct depuis le client (le bucket autorise Create pour
// role:member) — retourne l'ID du fichier à stocker sur la story.
export async function uploadStoryImage(file: File): Promise<string> {
    const uploaded = await storage.createFile(BUCKETS.STORY_IMAGES, ID.unique(), file);
    return uploaded.$id;
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
                country: data.country || '',
                authorId: data.authorId,
                authorName: data.isAnonymous ? '' : (data.authorName || ''),
                isAnonymous: data.isAnonymous,
                coverImageId: data.coverImageId || '',
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

    // Feed paginé par curseur, avec filtre catégorie ET pays optionnels.
    async getFeed(options: {
        limit?: number;
        cursor?: string;
        categorySlug?: string;
        countrySlug?: string;
    } = {}) {
        const { limit = 20, cursor, categorySlug, countrySlug } = options;

        const queries = [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('$createdAt'),
            Query.limit(limit),
        ];

        if (categorySlug && categorySlug !== 'tout') {
            queries.push(Query.equal('categoryId', categorySlug));
        }
        if (countrySlug && countrySlug !== 'tous') {
            queries.push(Query.equal('country', countrySlug));
        }
        if (cursor) {
            queries.push(Query.cursorAfter(cursor));
        }

        return await databases.listDocuments<Story>(DATABASE_ID, COLLECTIONS.STORIES, queries);
    },

    // Histoires les plus réagies (⭐ Tendances). Trie directement sur
    // reactionsCount — plus simple et immédiatement fiable que
    // trendingScore, qui n'est pour l'instant jamais calculé (champ réservé
    // pour un futur algorithme pondéré temps/récence).
    async getMostReacted(limit = 30) {
        return await databases.listDocuments<Story>(DATABASE_ID, COLLECTIONS.STORIES, [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('reactionsCount'),
            Query.limit(limit),
        ]);
    },

    async getTrending(limit = 10) {
        return await databases.listDocuments<Story>(DATABASE_ID, COLLECTIONS.STORIES, [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('trendingScore'),
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

    // Recherche par titre (fulltext) — utilisée par la recherche globale.
    async searchByTitle(query: string, limit = 8) {
        if (!query.trim()) return [];
        const result = await databases.listDocuments<Story>(DATABASE_ID, COLLECTIONS.STORIES, [
            Query.equal('moderationStatus', 'visible'),
            Query.search('title', query),
            Query.limit(limit),
        ]);
        return result.documents;
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
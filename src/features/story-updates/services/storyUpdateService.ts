// src/features/story-updates/services/storyUpdateService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export type StoryUpdateType = 'mise_a_jour' | 'contradiction' | 'confirmation' | 'dementi';

export interface StoryUpdate extends Models.Document {
    storyId: string;
    authorId: string;
    content: string;
    type: StoryUpdateType;
    createdAt: string;
}

export const storyUpdateService = {
    async create(storyId: string, authorId: string, content: string, type: StoryUpdateType): Promise<StoryUpdate> {
        return await databases.createDocument<StoryUpdate>(
            DATABASE_ID,
            COLLECTIONS.STORY_UPDATES,
            ID.unique(),
            { storyId, authorId, content, type, createdAt: new Date().toISOString() }
        );
    },

    async getByStory(storyId: string): Promise<StoryUpdate[]> {
        const result = await databases.listDocuments<StoryUpdate>(DATABASE_ID, COLLECTIONS.STORY_UPDATES, [
            Query.equal('storyId', storyId),
            Query.orderAsc('createdAt'),
            Query.limit(100),
        ]);
        return result.documents;
    },
};

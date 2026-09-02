// src/features/references/services/storyReferenceService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';
import { referenceService, type Reference } from './referenceService';

export interface StoryReference extends Models.Document {
    storyId: string;
    referenceId: string;
}

export const storyReferenceService = {
    async link(storyId: string, referenceId: string): Promise<void> {
        // Évite les doublons (pas de contrainte unique composite gérée ici
        // côté client, donc on vérifie avant de créer).
        const existing = await databases.listDocuments<StoryReference>(DATABASE_ID, COLLECTIONS.STORY_REFERENCES, [
            Query.equal('storyId', storyId),
            Query.equal('referenceId', referenceId),
            Query.limit(1),
        ]);
        if (existing.documents.length > 0) return;

        await databases.createDocument(DATABASE_ID, COLLECTIONS.STORY_REFERENCES, ID.unique(), {
            storyId, referenceId,
            createdAt: new Date().toISOString(),
        });
        await referenceService.incrementStoriesCount(referenceId);
    },

    async linkMany(storyId: string, referenceIds: string[]): Promise<void> {
        const results = await Promise.allSettled(referenceIds.map((refId) => this.link(storyId, refId)));
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                // Ne bloque pas la publication de l'histoire, mais laisse
                // une trace claire dans la console — sans ça, un échec de
                // permission sur `story_references` ou `references` passe
                // totalement inaperçu et l'histoire n'apparaît jamais sur
                // la fiche de la référence, sans aucune explication.
                console.error(`[storyReferenceService] Échec de liaison avec la référence ${referenceIds[i]} :`, r.reason);
            }
        });
    },

    async getReferencesForStory(storyId: string): Promise<Reference[]> {
        const links = await databases.listDocuments<StoryReference>(DATABASE_ID, COLLECTIONS.STORY_REFERENCES, [
            Query.equal('storyId', storyId),
            Query.limit(20),
        ]);
        if (links.documents.length === 0) return [];

        const results = await Promise.allSettled(
            links.documents.map((link) => referenceService.getById(link.referenceId))
        );
        return results
            .filter((r): r is PromiseFulfilledResult<Reference> => r.status === 'fulfilled')
            .map((r) => r.value);
    },

    async getStoryIdsForReference(referenceId: string, limit = 50): Promise<string[]> {
        const links = await databases.listDocuments<StoryReference>(DATABASE_ID, COLLECTIONS.STORY_REFERENCES, [
            Query.equal('referenceId', referenceId),
            Query.limit(limit),
        ]);
        return links.documents.map((l) => l.storyId);
    },
};

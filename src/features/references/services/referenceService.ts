// src/features/references/services/referenceService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';
import { slugify } from '@/utils/slugify';

export type ReferenceType = 'personne' | 'evenement' | 'lieu' | 'entreprise' | 'sujet';

export interface Reference extends Models.Document {
    name: string;
    slug: string;
    type: ReferenceType;
    description?: string;
    avatarUrl?: string;
    category?: string;
    isVerifiedEntity: boolean;
    storiesCount: number;
    followersCount: number;
    createdBy?: string;
    createdAt: string;
}

export const referenceService = {
    async create(data: { name: string; type: ReferenceType; description?: string; createdBy?: string }): Promise<Reference> {
        return await databases.createDocument<Reference>(
            DATABASE_ID,
            COLLECTIONS.REFERENCES,
            ID.unique(),
            {
                name: data.name.trim(),
                slug: slugify(data.name),
                type: data.type,
                description: data.description || '',
                avatarUrl: '',
                category: '',
                isVerifiedEntity: false,
                storiesCount: 0,
                followersCount: 0,
                createdBy: data.createdBy || '',
                createdAt: new Date().toISOString(),
            }
        );
    },

    // Recherche par nom (fulltext) — utilisée pour l'autocomplete au tag.
    async search(query: string, limit = 8): Promise<Reference[]> {
        if (!query.trim()) return [];
        const result = await databases.listDocuments<Reference>(DATABASE_ID, COLLECTIONS.REFERENCES, [
            Query.search('name', query),
            Query.limit(limit),
        ]);
        return result.documents;
    },

    async getById(id: string): Promise<Reference> {
        return await databases.getDocument<Reference>(DATABASE_ID, COLLECTIONS.REFERENCES, id);
    },

    async getBySlug(slug: string): Promise<Reference | null> {
        const result = await databases.listDocuments<Reference>(DATABASE_ID, COLLECTIONS.REFERENCES, [
            Query.equal('slug', slug),
            Query.limit(1),
        ]);
        return result.documents[0] || null;
    },

    async getTrending(limit = 10): Promise<Reference[]> {
        const result = await databases.listDocuments<Reference>(DATABASE_ID, COLLECTIONS.REFERENCES, [
            Query.orderDesc('storiesCount'),
            Query.limit(limit),
        ]);
        return result.documents;
    },

    async incrementStoriesCount(referenceId: string): Promise<void> {
        try {
            const ref = await this.getById(referenceId);
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId, {
                storiesCount: (ref.storiesCount || 0) + 1,
            });
        } catch { /* non bloquant */ }
    },

    async updateFollowersCount(referenceId: string, delta: number): Promise<void> {
        try {
            const ref = await this.getById(referenceId);
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.REFERENCES, referenceId, {
                followersCount: Math.max(0, (ref.followersCount || 0) + delta),
            });
        } catch { /* non bloquant */ }
    },

    // Récupère ou crée une référence par nom — utilisé quand l'utilisateur
    // tape un nom qui ne correspond à aucun résultat existant.
    async findOrCreate(name: string, type: ReferenceType, createdBy?: string): Promise<Reference> {
        const existing = await this.search(name, 1);
        const exactMatch = existing.find((r) => r.name.toLowerCase() === name.trim().toLowerCase());
        if (exactMatch) return exactMatch;
        return await this.create({ name, type, createdBy });
    },
};
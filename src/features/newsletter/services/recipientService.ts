// src/features/newsletter/services/recipientService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { Query, Models } from 'appwrite';

// Étendre Models.Document règle directement l'erreur de typage avec Appwrite
export interface RecipientUser extends Models.Document {
    name: string;
    reputationScore?: number;
    storiesCount?: number;
    createdAt?: string;
    isBanned?: boolean;
    newsletterOptOut?: boolean;
}

export type SortOption = 'recent' | 'reputation' | 'name';

export const recipientService = {
    async list(options: { search?: string; sort?: SortOption; limit?: number; offset?: number } = {}) {
        const { search, sort = 'recent', limit = 20, offset = 0 } = options;
        const queries = [Query.limit(limit), Query.offset(offset)];

        if (search && search.trim()) {
            queries.push(Query.search('name', search.trim()));
        }
        if (sort === 'recent') queries.push(Query.orderDesc('createdAt'));
        else if (sort === 'reputation') queries.push(Query.orderDesc('reputationScore'));
        else if (sort === 'name') queries.push(Query.orderAsc('name'));

        // Utilisation directe du type RecipientUser
        const result = await databases.listDocuments<RecipientUser>(
            DATABASE_ID, COLLECTIONS.USERS, queries
        );
        return { documents: result.documents, total: result.total };
    },
};
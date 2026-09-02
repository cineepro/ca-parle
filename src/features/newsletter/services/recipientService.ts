// src/features/newsletter/services/recipientService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { Query } from 'appwrite';

export interface RecipientUser {
    $id: string;
    name: string;
    reputationScore?: number;
    storiesCount?: number;
    createdAt?: string;
    isBanned?: boolean;
    newsletterOptOut?: boolean;
}

export type SortOption = 'recent' | 'reputation' | 'name';

export const recipientService = {
    // ⚠️ Le tri par `createdAt`/`reputationScore` nécessite un index sur
    // ces attributs dans la collection `users`. Si le tri échoue avec une
    // erreur "Attribute not found in schema" ou similaire côté Appwrite,
    // crée un index de type "key" sur l'attribut concerné.
    async list(options: { search?: string; sort?: SortOption; limit?: number; offset?: number } = {}) {
        const { search, sort = 'recent', limit = 20, offset = 0 } = options;
        const queries = [Query.limit(limit), Query.offset(offset)];

        if (search && search.trim()) {
            queries.push(Query.search('name', search.trim()));
        }
        if (sort === 'recent') queries.push(Query.orderDesc('createdAt'));
        else if (sort === 'reputation') queries.push(Query.orderDesc('reputationScore'));
        else if (sort === 'name') queries.push(Query.orderAsc('name'));

        const result = await databases.listDocuments(
            DATABASE_ID, COLLECTIONS.USERS, queries
        );
        return { documents: result.documents as unknown as (RecipientUser & { $id: string })[], total: result.total };
    },
};

// src/features/caSert/services/caSertService.ts — Ça Parle
import { databases, storage } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS, FUNCTIONS } from '@/api/auth';
import { BUCKETS } from '@/api/constants';
import { callFunction } from '@/api/functionsClient';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export type ModerationStatus = 'visible' | 'masque' | 'supprime';

export interface Spot extends Models.Document {
    name: string;
    category: string;
    description?: string;
    quartier?: string;
    country?: string;
    phone?: string;
    photoFileId?: string;
    authorId: string;
    authorName?: string;
    confirmCount: number;
    isVerified: boolean;
    moderationStatus: ModerationStatus;
    createdAt: string;
}

export interface CreateSpotInput {
    name: string;
    category: string;
    description?: string;
    quartier?: string;
    country?: string;
    phone?: string;
    photoFileId?: string;
    authorId: string;
    authorName?: string;
}

export interface MarketPrice extends Models.Document {
    item: string;
    price: number;
    unit?: string;
    quartier?: string;
    country?: string;
    authorId: string;
    active: boolean;
    createdAt: string;
}

export interface CreatePriceInput {
    item: string;
    price: number;
    unit?: string;
    quartier?: string;
    country?: string;
    authorId: string;
}

// Réutilise le bucket story-images déjà configuré — pas besoin d'un bucket
// dédié pour de simples photos de lieux.
export function getSpotImageUrl(fileId: string): string {
    return storage.getFileView(BUCKETS.STORY_IMAGES, fileId).toString();
}

export async function uploadSpotImage(file: File): Promise<string> {
    const uploaded = await storage.createFile(BUCKETS.STORY_IMAGES, ID.unique(), file);
    return uploaded.$id;
}

export const caSertService = {
    // --- Fiches lieux/services ---
    async listSpots(category?: string, country?: string, limit = 30): Promise<Spot[]> {
        const queries = [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('$createdAt'),
            Query.limit(limit),
        ];
        if (category && category !== 'tout') queries.push(Query.equal('category', category));
        if (country && country !== 'tous') queries.push(Query.equal('country', country));

        const result = await databases.listDocuments<Spot>(DATABASE_ID, COLLECTIONS.LOCAL_SPOTS, queries);
        return result.documents;
    },

    async createSpot(data: CreateSpotInput): Promise<Spot> {
        return databases.createDocument<Spot>(DATABASE_ID, COLLECTIONS.LOCAL_SPOTS, ID.unique(), {
            name: data.name,
            category: data.category,
            description: data.description || '',
            quartier: data.quartier || '',
            country: data.country || '',
            phone: data.phone || '',
            photoFileId: data.photoFileId || '',
            authorId: data.authorId,
            authorName: data.authorName || '',
            confirmCount: 0,
            isVerified: false,
            moderationStatus: 'visible',
            createdAt: new Date().toISOString(),
        });
    },

    // Bascule : confirme si pas encore fait, retire sinon. Renvoie l'état
    // final pour mettre à jour l'affichage sans recharger toute la liste.
    async confirmSpot(spotId: string): Promise<{ confirmed: boolean }> {
        return callFunction(FUNCTIONS.CONFIRM_SPOT, { spotId });
    },

    // --- Prix du marché (ticker) ---
    async listPrices(country?: string, limit = 20): Promise<MarketPrice[]> {
        const queries = [
            Query.equal('active', true),
            Query.orderDesc('$createdAt'),
            Query.limit(limit),
        ];
        if (country && country !== 'tous') queries.push(Query.equal('country', country));

        const result = await databases.listDocuments<MarketPrice>(DATABASE_ID, COLLECTIONS.MARKET_PRICES, queries);
        return result.documents;
    },

    async createPrice(data: CreatePriceInput): Promise<MarketPrice> {
        return databases.createDocument<MarketPrice>(DATABASE_ID, COLLECTIONS.MARKET_PRICES, ID.unique(), {
            item: data.item,
            price: data.price,
            unit: data.unit || '',
            quartier: data.quartier || '',
            country: data.country || '',
            authorId: data.authorId,
            active: true,
            createdAt: new Date().toISOString(),
        });
    },
};
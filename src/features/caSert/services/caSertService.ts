// src/features/caSert/services/caSertService.ts — Vanessa
import { databases, storage } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS, FUNCTIONS } from '@/api/auth';
import { BUCKETS } from '@/api/constants';
import { callFunction } from '@/api/functionsClient';
import { ID, Query, Permission, Role } from 'appwrite';
import type { Models } from 'appwrite';

// 'attente' : visible seulement par son auteur (et les modérateurs, via la
// Function serveur qui contourne les permissions) — c'est l'état par
// défaut à la création, tant que personne ne l'a validé.
// 'visible' : validé par un modérateur, permissions élargies à tout le
// monde à ce moment-là (voir moderate-ca-sert).
// 'refuse'  : reste visible uniquement par son auteur, pour qu'il sache
// que ça a été rejeté, sans jamais apparaître publiquement.
export type ModerationStatus = 'attente' | 'visible' | 'refuse';

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
    // Position posée par l'auteur lui-même sur la carte au moment de la
    // publication — jamais devinée automatiquement, pour garantir des
    // coordonnées réellement fiables (voir LocationPicker).
    latitude?: number;
    longitude?: number;
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
    latitude: number;
    longitude: number;
}

export interface MarketPrice extends Models.Document {
    item: string;
    price: number;
    unit?: string;
    quartier?: string;
    country?: string;
    authorId: string;
    active: boolean;
    moderationStatus: ModerationStatus;
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

// Permissions au moment de la création : SEUL l'auteur peut lire son
// propre document tant qu'il est "en attente" — pas de Permission.read(any)
// ici. C'est le Function moderate-ca-sert (avec la clé API serveur, qui
// contourne toutes les permissions) qui élargit la lecture à tout le monde
// au moment de la validation. Avant validation, même un autre utilisateur
// qui interrogerait directement la collection ne verrait pas ce document.
function pendingPermissions(authorId: string) {
    return [
        Permission.read(Role.user(authorId)),
        Permission.update(Role.user(authorId)),
    ];
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
        return databases.createDocument<Spot>(
            DATABASE_ID, COLLECTIONS.LOCAL_SPOTS, ID.unique(),
            {
                name: data.name,
                category: data.category,
                description: data.description || '',
                quartier: data.quartier || '',
                country: data.country || '',
                phone: data.phone || '',
                photoFileId: data.photoFileId || '',
                authorId: data.authorId,
                authorName: data.authorName || '',
                latitude: data.latitude,
                longitude: data.longitude,
                confirmCount: 0,
                isVerified: false,
                moderationStatus: 'attente',
                createdAt: new Date().toISOString(),
            },
            pendingPermissions(data.authorId)
        );
    },

    // Bascule : confirme si pas encore fait, retire sinon.
    async confirmSpot(spotId: string): Promise<{ confirmed: boolean }> {
        return callFunction(FUNCTIONS.CONFIRM_SPOT, { spotId });
    },

    // --- Prix du marché (ticker) ---
    async listPrices(country?: string, limit = 20): Promise<MarketPrice[]> {
        const queries = [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('$createdAt'),
            Query.limit(limit),
        ];
        if (country && country !== 'tous') queries.push(Query.equal('country', country));

        const result = await databases.listDocuments<MarketPrice>(DATABASE_ID, COLLECTIONS.MARKET_PRICES, queries);
        return result.documents;
    },

    async createPrice(data: CreatePriceInput): Promise<MarketPrice> {
        return databases.createDocument<MarketPrice>(
            DATABASE_ID, COLLECTIONS.MARKET_PRICES, ID.unique(),
            {
                item: data.item,
                price: data.price,
                unit: data.unit || '',
                quartier: data.quartier || '',
                country: data.country || '',
                authorId: data.authorId,
                active: true,
                moderationStatus: 'attente',
                createdAt: new Date().toISOString(),
            },
            pendingPermissions(data.authorId)
        );
    },

    // --- Suivi personnel ("Mes contributions") ---
    // Fonctionne grâce aux permissions posées à la création : l'auteur
    // garde toujours le droit de lire ses propres documents, quel que soit
    // leur statut (en attente, validé, refusé) — pas besoin de Function ici.
    async listMyContributions(userId: string): Promise<{ spots: Spot[]; prices: MarketPrice[] }> {
        const [spots, prices] = await Promise.all([
            databases.listDocuments<Spot>(DATABASE_ID, COLLECTIONS.LOCAL_SPOTS, [
                Query.equal('authorId', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(50),
            ]),
            databases.listDocuments<MarketPrice>(DATABASE_ID, COLLECTIONS.MARKET_PRICES, [
                Query.equal('authorId', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(50),
            ]),
        ]);
        return { spots: spots.documents, prices: prices.documents };
    },
};
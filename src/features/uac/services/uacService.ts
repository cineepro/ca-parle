// src/features/uac/services/uacService.ts — Vanessa
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS, FUNCTIONS } from '@/api/constants';
import { callFunction } from '@/api/functionsClient';
import { Query } from 'appwrite';
import type { Models } from 'appwrite';
import type { NewsKind, PlaceKind, WeekMenu } from '../config';
import { parseSchedule } from '../lib/menu';

export interface UacNews extends Models.Document {
    kind: NewsKind;
    title: string;
    content: string;
    contact?: string;
    eventDate?: string;
    imageId?: string;
    authorId: string;
    authorName?: string;
    moderationStatus: 'visible' | 'masque';
    createdAt: string;
}

export interface UacRestaurantDoc extends Models.Document {
    name: string;
    place?: string;
    order: number;
    active: boolean;
    schedule: string;
}

export interface UacRestaurant {
    id: string;
    name: string;
    place: string;
    order: number;
    active: boolean;
    menu: WeekMenu;
}

const toRestaurant = (d: UacRestaurantDoc): UacRestaurant => ({
    id: d.$id, name: d.name, place: d.place || '', order: d.order ?? 0, active: d.active !== false, menu: parseSchedule(d.schedule),
});

export interface UacPlace extends Models.Document {
    name: string;
    kind: PlaceKind;
    latitude: number;
    longitude: number;
    description?: string;
    active: boolean;
}

export interface PlaceCandidate {
    osmId: string;
    name: string;
    kind: PlaceKind;
    latitude: number;
    longitude: number;
    description?: string;
}

export interface NewsInput {
    kind: NewsKind;
    title: string;
    content: string;
    contact?: string;
    eventDate?: string;
    imageId?: string;
}

export const uacService = {
    async listPlaces(includeInactive = false): Promise<UacPlace[]> {
        if (!COLLECTIONS.UAC_PLACES) return [];
        const queries = [Query.orderAsc('name'), Query.limit(500)];
        if (!includeInactive) queries.unshift(Query.equal('active', true));
        const r = await databases.listDocuments<UacPlace>(DATABASE_ID, COLLECTIONS.UAC_PLACES, queries);
        return r.documents;
    },
    savePlace: (p: { id?: string; name: string; kind: PlaceKind; latitude: number; longitude: number; description?: string; active?: boolean }) =>
        callFunction(FUNCTIONS.MANAGE_UAC, { action: 'save_place', ...p }),
    deletePlace: (id: string) => callFunction(FUNCTIONS.MANAGE_UAC, { action: 'delete_place', id }),
    savePlaces: (places: PlaceCandidate[]) => callFunction<{ saved: number }>(FUNCTIONS.MANAGE_UAC, { action: 'save_places', places }),
    importOsmPlaces: (latitude: number, longitude: number, radius: number) =>
        callFunction<{ candidates: PlaceCandidate[]; found: number }>(FUNCTIONS.MANAGE_UAC, { action: 'import_osm_places', latitude, longitude, radius }),

    async listRestaurants(includeInactive = false): Promise<UacRestaurant[]> {
        if (!COLLECTIONS.UAC_RESTAURANTS) return [];
        const queries = [Query.orderAsc('order'), Query.limit(10)];
        if (!includeInactive) queries.unshift(Query.equal('active', true));
        const r = await databases.listDocuments<UacRestaurantDoc>(DATABASE_ID, COLLECTIONS.UAC_RESTAURANTS, queries);
        return r.documents.map(toRestaurant);
    },

    async listNews(kind: NewsKind | 'tout', cursor?: string, limit = 15) {
        const queries = [Query.equal('moderationStatus', 'visible'), Query.orderDesc('createdAt'), Query.limit(limit)];
        if (kind !== 'tout') queries.push(Query.equal('kind', kind));
        if (cursor) queries.push(Query.cursorAfter(cursor));
        return databases.listDocuments<UacNews>(DATABASE_ID, COLLECTIONS.UAC_NEWS, queries);
    },

    async publishNews(input: NewsInput): Promise<UacNews> {
        const r = await callFunction<{ document: UacNews }>(FUNCTIONS.MANAGE_UAC, { action: 'publish_news', ...input });
        return r.document;
    },
    deleteNews: (id: string) => callFunction(FUNCTIONS.MANAGE_UAC, { action: 'delete_news', id }),

    // Réservé aux modérateurs (la Function revérifie).
    hideNews: (id: string) => callFunction(FUNCTIONS.MANAGE_UAC, { action: 'hide_news', id }),
    showNews: (id: string) => callFunction(FUNCTIONS.MANAGE_UAC, { action: 'show_news', id }),
    async listAllNews(): Promise<UacNews[]> {
        const r = await callFunction<{ documents: UacNews[] }>(FUNCTIONS.MANAGE_UAC, { action: 'list_news_all' });
        return r.documents;
    },
    saveRestaurant: (r: { id?: string; name: string; place: string; order: number; active: boolean; menu: WeekMenu }) =>
        callFunction(FUNCTIONS.MANAGE_UAC, { action: 'save_restaurant', id: r.id, name: r.name, place: r.place, order: r.order, active: r.active, schedule: r.menu }),
    deleteRestaurant: (id: string) => callFunction(FUNCTIONS.MANAGE_UAC, { action: 'delete_restaurant', id }),
};

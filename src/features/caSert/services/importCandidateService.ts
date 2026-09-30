// src/features/caSert/services/importCandidateService.ts — Vanessa
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export interface ImportCandidate {
    $id: string;
    source: string;
    sourceRef: string;
    status: 'en_attente' | 'accepte' | 'ignore';
    name: string;
    category: string;
    description?: string;
    quartier?: string;
    country?: string;
    phone?: string;
    latitude: number;
    longitude: number;
    addressHint?: string;
    createdAt: string;
}

export const importCandidateService = {
    search: (lat: number, lng: number, radiusMeters: number, category: string) =>
        callFunction<{ found: number; created: number }>(FUNCTIONS.IMPORT_OSM_SPOTS, {
            action: 'search', lat, lng, radiusMeters, category,
        }),

    list: () => callFunction<{ candidates: ImportCandidate[] }>(FUNCTIONS.IMPORT_OSM_SPOTS, { action: 'list', status: 'en_attente' }).then((r) => r.candidates),

    accept: (candidateId: string, overrides?: Partial<ImportCandidate>) =>
        callFunction(FUNCTIONS.IMPORT_OSM_SPOTS, { action: 'accept', candidateId, overrides }),

    ignore: (candidateId: string) => callFunction(FUNCTIONS.IMPORT_OSM_SPOTS, { action: 'ignore', candidateId }),
};
// src/features/caSert/services/routeService.ts — Ça Parle
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';
import type { LineString } from 'geojson';

export interface RouteResult {
    geometry: LineString;
    distanceKm: string;
    durationMin: number;
}

export const routeService = {
    async getRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<RouteResult> {
        return callFunction(FUNCTIONS.GET_ROUTE, { fromLat, fromLng, toLat, toLng });
    },
};
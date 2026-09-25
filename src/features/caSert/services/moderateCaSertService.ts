// src/features/caSert/services/moderateCaSertService.ts — Vanessa
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/auth';
import type { Spot, MarketPrice } from './caSertService';

export const moderateCaSertService = {
    async listPending(): Promise<{ spots: Spot[]; prices: MarketPrice[] }> {
        const result = await callFunction<{ spots: Spot[]; prices: MarketPrice[] }>(FUNCTIONS.MODERATE_CA_SERT, { action: 'list_pending' });
        return { spots: result.spots, prices: result.prices };
    },

    async approve(type: 'spot' | 'price', id: string): Promise<void> {
        await callFunction(FUNCTIONS.MODERATE_CA_SERT, { action: 'approve', type, id });
    },

    async reject(type: 'spot' | 'price', id: string): Promise<void> {
        await callFunction(FUNCTIONS.MODERATE_CA_SERT, { action: 'reject', type, id });
    },
};
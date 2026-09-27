// src/features/vanessa/services/emissionService.ts — Vanessa
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';
import type { Conversation } from '@/features/messaging/services/conversationService';

export interface Emission {
    $id: string;
    title: string;
    guestName: string;
    topic: string;
    posture: string;
    status: 'préparé' | 'enregistré' | 'publié';
    conversationId: string;
    createdBy: string;
    createdAt: string;
}

export interface CreateEmissionInput {
    title: string;
    guestName?: string;
    topic: string;
    posture?: string;
}

export const emissionService = {
    async create(input: CreateEmissionInput): Promise<{ emission: Emission; conversation: Conversation }> {
        return callFunction(FUNCTIONS.MANAGE_EMISSIONS, { action: 'create', ...input });
    },

    async list(): Promise<Emission[]> {
        const result = await callFunction<{ emissions: Emission[] }>(FUNCTIONS.MANAGE_EMISSIONS, { action: 'list' });
        return result.emissions;
    },

    async updateStatus(emissionId: string, status: Emission['status']): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_EMISSIONS, { action: 'update_status', emissionId, status });
    },
};
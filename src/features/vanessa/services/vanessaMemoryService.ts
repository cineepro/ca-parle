// src/features/vanessa/services/vanessaMemoryService.ts — Vanessa
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export interface VanessaMemoryEntry {
    $id: string;
    content: string;
    createdAt: string;
}

export const vanessaMemoryService = {
    async list(): Promise<VanessaMemoryEntry[]> {
        const result = await callFunction<{ memory: VanessaMemoryEntry[] }>(FUNCTIONS.MANAGE_VANESSA_MEMORY, { action: 'list' });
        return result.memory;
    },

    async deleteOne(memoryId: string): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_MEMORY, { action: 'delete', memoryId });
    },

    async clearAll(): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_MEMORY, { action: 'clear' });
    },
};
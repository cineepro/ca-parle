// src/features/vanessa/services/vanessaKnowledgeService.ts — Ça Parle
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export interface VanessaKnowledge {
    $id: string;
    category: string;
    content: string;
    active: boolean;
    createdAt: string;
}

export const vanessaKnowledgeService = {
    async list(): Promise<VanessaKnowledge[]> {
        const result = await callFunction<{ documents: VanessaKnowledge[] }>(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'list' });
        return result.documents;
    },

    async create(category: string, content: string): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'create', category, content });
    },

    async update(id: string, data: Partial<Pick<VanessaKnowledge, 'category' | 'content' | 'active'>>): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'update', id, ...data });
    },

    async remove(id: string): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'delete', id });
    },
};
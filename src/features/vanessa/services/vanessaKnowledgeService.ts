// src/features/vanessa/services/vanessaKnowledgeService.ts — Ça Parle
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export interface VanessaKnowledge {
    $id: string;
    category: string;
    content: string;
    active: boolean;
    connectorId?: string;
    createdAt: string;
}

export interface VanessaConnector {
    $id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
    description: string;
    active: boolean;
    createdAt?: string;
}

export const vanessaKnowledgeService = {
    // --- Notes de connaissance ---
    async list(): Promise<VanessaKnowledge[]> {
        const result = await callFunction<{ documents: VanessaKnowledge[] }>(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'list' });
        return result.documents;
    },

    async create(category: string, content: string, connectorId?: string): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'create', category, content, connectorId: connectorId || '' });
    },

    async update(id: string, data: Partial<Pick<VanessaKnowledge, 'category' | 'content' | 'active' | 'connectorId'>>): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'update', id, ...data });
    },

    async remove(id: string): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'delete', id });
    },

    // --- Connecteurs (gestion complète, modérateur) ---
    async listConnectors(): Promise<VanessaConnector[]> {
        const result = await callFunction<{ connectors: VanessaConnector[] }>(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'list_connectors' });
        return result.connectors;
    },

    async createConnector(data: Omit<VanessaConnector, '$id' | 'createdAt'>): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'create_connector', ...data });
    },

    async updateConnector(id: string, data: Partial<Omit<VanessaConnector, '$id' | 'createdAt'>>): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'update_connector', id, ...data });
    },

    async removeConnector(id: string): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'delete_connector', id });
    },

    // --- Connecteurs actifs (public, pour les pastilles dans le chat) ---
    async listActiveConnectors(): Promise<VanessaConnector[]> {
        const result = await callFunction<{ connectors: VanessaConnector[] }>(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'list_active_connectors' });
        return result.connectors;
    },
};
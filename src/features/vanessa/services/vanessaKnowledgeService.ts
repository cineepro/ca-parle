// src/features/vanessa/services/vanessaKnowledgeService.ts — Ça Parle
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';
import { storage } from '@/api/appwrite';
import { BUCKETS } from '@/api/constants';
import { ID } from 'appwrite';

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
    sourceUrl?: string;
    lastSyncedAt?: string;
    active: boolean;
    createdAt?: string;
}

// Upload d'un PDF destiné à être lu et résumé pour un connecteur — bucket
// dédié, distinct de story-images (types de fichiers différents).
export async function uploadConnectorPdf(file: File): Promise<string> {
    const uploaded = await storage.createFile(BUCKETS.CONNECTOR_DOCUMENTS, ID.unique(), file);
    return uploaded.$id;
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

    async createConnector(data: Omit<VanessaConnector, '$id' | 'createdAt' | 'lastSyncedAt'>): Promise<void> {
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

    // --- Ingestion d'un PDF sur un connecteur ---
    async ingestPdf(connectorId: string, file: File): Promise<void> {
        const fileId = await uploadConnectorPdf(file);
        await callFunction(FUNCTIONS.INGEST_CONNECTOR_PDF, { connectorId, fileId });
    },
};
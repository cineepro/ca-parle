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
    // Compteur mensuel de questions posées à ce connecteur (remis à zéro
    // chaque mois côté backend). questionCountMonth est au format "AAAA-MM"
    // — toujours vérifier qu'il correspond au mois en cours avant
    // d'afficher questionCount tel quel (voir formatMonthlyQuestionCount).
    questionCount?: number;
    questionCountMonth?: string;
    // Facturation — tokensGranted à 0 = illimité (connecteur non facturé,
    // comportement par défaut pour ne rien casser sur les connecteurs
    // créés avant ce système). Dès que tokensGranted > 0, le connecteur
    // devient indisponible une fois tokensUsed >= tokensGranted, jusqu'à
    // une recharge.
    tokensGranted?: number;
    tokensUsed?: number;
    // Compte Appwrite du partenaire autorisé à consulter l'espace
    // partenaire pour CE connecteur précis (vide = aucun accès partenaire
    // configuré).
    partnerUserId?: string;
}

export interface MyConnectorUsage {
    $id: string;
    name: string;
    icon: string;
    color: string;
    active: boolean;
    tokensGranted: number;
    tokensUsed: number;
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

    // --- Facturation ---
    // amountFcfa : le montant reçu du partenaire — le serveur calcule
    // lui-même l'équivalent en tokens selon la grille tarifaire en vigueur
    // (voir Vanessa-API-Grille-Tarifaire.docx), pour garder un seul endroit
    // où ce taux est défini.
    async rechargeConnectorTokens(id: string, amountFcfa: number): Promise<{ tokensAdded: number }> {
        return callFunction(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'recharge_connector_tokens', id, amountFcfa });
    },

    // --- Connecteurs actifs (public, pour les pastilles dans le chat) ---
    async listActiveConnectors(): Promise<VanessaConnector[]> {
        const result = await callFunction<{ connectors: VanessaConnector[] }>(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'list_active_connectors' });
        return result.connectors;
    },

    // --- Espace partenaire ---
    async getMyConnector(): Promise<MyConnectorUsage | null> {
        const result = await callFunction<{ connector: MyConnectorUsage | null }>(FUNCTIONS.MANAGE_VANESSA_KNOWLEDGE, { action: 'get_my_connector' });
        return result.connector;
    },

    // --- Ingestion d'un PDF sur un connecteur ---
    async ingestPdf(connectorId: string, file: File): Promise<void> {
        const fileId = await uploadConnectorPdf(file);
        await callFunction(FUNCTIONS.INGEST_CONNECTOR_PDF, { connectorId, fileId });
    },
};
// src/features/moderation/services/reportService.ts — Ça Parle
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export type ReportTargetType = 'story' | 'comment' | 'user';
export type ReportReason = 'diffamation' | 'harcelement' | 'fausse_info' | 'contenu_prive' | 'contenu_sexuel' | 'autre';
export type ReportStatus = 'en_attente' | 'traite' | 'rejete';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
    diffamation: 'Diffamation',
    harcelement: 'Harcèlement',
    fausse_info: 'Fausse information',
    contenu_prive: 'Données privées',
    contenu_sexuel: 'Contenu sexuel',
    autre: 'Autre',
};

export interface Report extends Models.Document {
    targetType: ReportTargetType;
    targetId: string;
    reporterId: string;
    reason: ReportReason;
    description?: string;
    status: ReportStatus;
    createdAt: string;
}

export const reportService = {
    async create(data: {
        targetType: ReportTargetType;
        targetId: string;
        reporterId: string;
        reason: ReportReason;
        description?: string;
    }): Promise<Report> {
        return await databases.createDocument<Report>(DATABASE_ID, COLLECTIONS.REPORTS, ID.unique(), {
            ...data,
            description: data.description || '',
            status: 'en_attente',
            createdAt: new Date().toISOString(),
        });
    },

    // Empêche un même utilisateur de spammer les signalements sur la même
    // cible (vérification best-effort côté client).
    async hasAlreadyReported(targetId: string, reporterId: string): Promise<boolean> {
        const result = await databases.listDocuments<Report>(DATABASE_ID, COLLECTIONS.REPORTS, [
            Query.equal('targetId', targetId),
            Query.equal('reporterId', reporterId),
            Query.limit(1),
        ]);
        return result.documents.length > 0;
    },

    async getPending(limit = 50): Promise<Report[]> {
        const result = await databases.listDocuments<Report>(DATABASE_ID, COLLECTIONS.REPORTS, [
            Query.equal('status', 'en_attente'),
            Query.orderAsc('createdAt'),
            Query.limit(limit),
        ]);
        return result.documents;
    },

    async resolve(reportId: string, status: 'traite' | 'rejete'): Promise<void> {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.REPORTS, reportId, { status });
    },
};
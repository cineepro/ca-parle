// src/features/predictions/services/predictionService.ts — Vanessa
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS, FUNCTIONS } from '@/api/auth';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';
import { callFunction } from '@/api/functionsClient';

export type PredictionStatus = 'ouverte' | 'resolue';

export interface Prediction extends Models.Document {
    storyId: string;
    question: string;
    options: string[];
    status: PredictionStatus;
    correctOptionIndex?: number;
    resolvesAt?: string;
    createdAt: string;
}

export interface PredictionVote extends Models.Document {
    predictionId: string;
    userId: string;
    optionIndex: number;
    createdAt: string;
}

export const predictionService = {
    async create(storyId: string, question: string, options: string[], resolvesAt?: string): Promise<Prediction> {
        return await databases.createDocument<Prediction>(
            DATABASE_ID,
            COLLECTIONS.PREDICTIONS,
            ID.unique(),
            {
                storyId,
                question,
                options,
                status: 'ouverte',
                resolvesAt: resolvesAt || '',
                createdAt: new Date().toISOString(),
            }
        );
    },

    async getByStory(storyId: string): Promise<Prediction[]> {
        const result = await databases.listDocuments<Prediction>(DATABASE_ID, COLLECTIONS.PREDICTIONS, [
            Query.equal('storyId', storyId),
            Query.orderDesc('createdAt'),
            Query.limit(10),
        ]);
        return result.documents;
    },

    async getUserVote(predictionId: string, userId: string): Promise<PredictionVote | null> {
        const result = await databases.listDocuments<PredictionVote>(DATABASE_ID, COLLECTIONS.PREDICTION_VOTES, [
            Query.equal('predictionId', predictionId),
            Query.equal('userId', userId),
            Query.limit(1),
        ]);
        return result.documents[0] || null;
    },

    // Le vote est figé : une fois voté, pas de changement possible
    // (cohérent avec l'absence d'Update/Delete prévue sur cette collection).
    async vote(predictionId: string, userId: string, optionIndex: number): Promise<void> {
        const existing = await this.getUserVote(predictionId, userId);
        if (existing) return; // déjà voté, on ignore silencieusement

        await databases.createDocument(DATABASE_ID, COLLECTIONS.PREDICTION_VOTES, ID.unique(), {
            predictionId,
            userId,
            optionIndex,
            createdAt: new Date().toISOString(),
        });
    },

    async getVoteCounts(predictionId: string, optionsLength: number): Promise<number[]> {
        const counts = new Array(optionsLength).fill(0);
        let offset = 0;
        const pageSize = 100;
        let hasMore = true;

        while (hasMore) {
            const result = await databases.listDocuments<PredictionVote>(DATABASE_ID, COLLECTIONS.PREDICTION_VOTES, [
                Query.equal('predictionId', predictionId),
                Query.limit(pageSize),
                Query.offset(offset),
            ]);
            result.documents.forEach((v) => {
                if (v.optionIndex >= 0 && v.optionIndex < counts.length) counts[v.optionIndex]++;
            });
            offset += pageSize;
            hasMore = result.documents.length === pageSize;
        }

        return counts;
    },

    // Résout la prédiction — délégué à la Function serveur
    // `resolve-prediction`, qui vérifie que l'appelant est bien l'auteur de
    // l'histoire (ou un modérateur) via son identité de session
    // (infalsifiable), puis met à jour la fiabilité de tous les votants,
    // attribue les badges et envoie les notifications.
    async resolve(predictionId: string, correctOptionIndex: number): Promise<void> {
        await callFunction(FUNCTIONS.RESOLVE_PREDICTION, { predictionId, correctOptionIndex });
    },
};

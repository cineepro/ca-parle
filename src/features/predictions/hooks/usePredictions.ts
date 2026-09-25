// src/features/predictions/hooks/usePredictions.ts — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { predictionService, type Prediction } from '../services/predictionService';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const usePredictions = (storyId: string) => {
    const { user } = useAuth();
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await predictionService.getByStory(storyId);
            setPredictions(list);
        } finally {
            setLoading(false);
        }
    }, [storyId]);

    useEffect(() => {
        load();
    }, [load]);

    const createPrediction = async (question: string, options: string[]) => {
        if (!user) return;
        await predictionService.create(storyId, question, options);
        await load();
    };

    return { predictions, loading, createPrediction, refresh: load };
};

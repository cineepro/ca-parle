// src/features/moderation/hooks/useReport.ts — Ça Parle
import { useState } from 'react';
import { reportService, type ReportTargetType, type ReportReason } from '../services/reportService';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const useReport = (targetType: ReportTargetType, targetId: string) => {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const submitReport = async (reason: ReportReason, description?: string) => {
        if (!user) {
            setError('Connecte-toi pour signaler un contenu.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const already = await reportService.hasAlreadyReported(targetId, user.$id);
            if (already) {
                setError('Tu as déjà signalé ce contenu.');
                return;
            }
            await reportService.create({
                targetType, targetId, reporterId: user.$id, reason, description,
            });
            setSuccess(true);
        } catch {
            setError('Impossible d\'envoyer le signalement, réessaie.');
        } finally {
            setSubmitting(false);
        }
    };

    return { submitReport, submitting, error, success };
};

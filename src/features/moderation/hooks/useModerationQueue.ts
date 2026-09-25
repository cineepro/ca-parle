// src/features/moderation/hooks/useModerationQueue.ts — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { reportService, type Report } from '../services/reportService';
import { storyService, type Story } from '@/features/stories/services/storyService';
import { commentService, type Comment } from '@/features/comments/services/commentService';

export interface ReportWithContent {
    report: Report;
    story?: Story;
    comment?: Comment;
    contentError?: boolean;
}

export const useModerationQueue = () => {
    const [items, setItems] = useState<ReportWithContent[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const reports = await reportService.getPending();

            const enriched = await Promise.all(
                reports.map(async (report): Promise<ReportWithContent> => {
                    try {
                        if (report.targetType === 'story') {
                            const story = await storyService.getStoryById(report.targetId);
                            return { report, story };
                        }
                        if (report.targetType === 'comment') {
                            const comment = await commentService.getById(report.targetId);
                            return { report, comment };
                        }
                        return { report };
                    } catch {
                        // Contenu déjà supprimé entre-temps.
                        return { report, contentError: true };
                    }
                })
            );

            setItems(enriched);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { items, loading, refresh: load };
};

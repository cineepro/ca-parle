// src/features/moderation/components/ModerationQueueItem.tsx — Ça Parle
import { useState } from 'react';
import type { ReportWithContent } from '../hooks/useModerationQueue';
import { REPORT_REASON_LABELS } from '../services/reportService';
import { moderationActionService } from '../services/moderationActionService';
import { Button } from '@/components/ui/button';

interface Props {
    item: ReportWithContent;
    onResolved: () => void;
}

export const ModerationQueueItem = ({ item, onResolved }: Props) => {
    const { report, story, comment, contentError } = item;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            onResolved();
        } catch (err: any) {
            setError(err.message || "Action refusée par le serveur.");
        } finally {
            setBusy(false);
        }
    };

    const handleHide = () => run(async () => {
        const targetId = story?.$id || comment?.$id;
        const action = story ? 'hide_story' : 'hide_comment';
        if (targetId) await moderationActionService.runAction(action, targetId, report.$id);
    });

    const handleDelete = () => run(async () => {
        const targetId = story?.$id || comment?.$id;
        const action = story ? 'delete_story' : 'delete_comment';
        if (targetId) await moderationActionService.runAction(action, targetId, report.$id);
    });

    const handleReject = () => run(async () => {
        await moderationActionService.runAction('reject_report', report.targetId, report.$id);
    });

    const handleBanAuthor = () => run(async () => {
        const authorId = story?.authorId || comment?.authorId;
        if (authorId) await moderationActionService.runAction('ban_author', authorId, report.$id);
    });

    return (
        <div className="bg-white rounded-2xl p-4 space-y-3 border border-gray-100">
            <div className="flex items-center justify-between">
                <span className="inline-block bg-red-50 text-red-600 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    {REPORT_REASON_LABELS[report.reason]}
                </span>
                <span className="text-xs text-gray-400">{report.targetType === 'story' ? '📄 Histoire' : '💬 Commentaire'}</span>
            </div>

            {report.description && (
                <p className="text-xs text-gray-500 italic">« {report.description} »</p>
            )}

            {contentError && (
                <p className="text-sm text-gray-400">Ce contenu a déjà été supprimé.</p>
            )}

            {story && (
                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-sm font-semibold text-gray-700">{story.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-3">{story.content}</p>
                </div>
            )}

            {comment && (
                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={handleReject} isLoading={busy}>
                    Rejeter
                </Button>
                {!contentError && (
                    <>
                        <Button size="sm" variant="secondary" onClick={handleHide} isLoading={busy}>
                            Masquer
                        </Button>
                        <Button size="sm" variant="danger" onClick={handleDelete} isLoading={busy}>
                            Supprimer
                        </Button>
                        <Button size="sm" variant="danger" onClick={handleBanAuthor} isLoading={busy}>
                            Bannir l'auteur
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};
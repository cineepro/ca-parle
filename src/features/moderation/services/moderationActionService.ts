// src/features/moderation/services/moderationActionService.ts — Ça Parle
// Toutes les actions ci-dessous sont désormais déléguées à la Function
// serveur `moderate-content`, qui vérifie isModerator === true sur
// l'appelant (via son identité de session, infalsifiable) avant d'agir.
// L'ancienne version écrivait directement en base depuis le client — ce
// qui aurait permis à n'importe qui de se passer pour modérateur.
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export type ModerationAction =
    | 'hide_story' | 'delete_story'
    | 'hide_comment' | 'delete_comment'
    | 'ban_author' | 'reject_report';

export const moderationActionService = {
    async runAction(action: ModerationAction, targetId: string, reportId?: string): Promise<void> {
        await callFunction(FUNCTIONS.MODERATE_CONTENT, { action, targetId, reportId });
    },
};

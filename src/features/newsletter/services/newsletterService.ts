// src/features/newsletter/services/newsletterService.ts — Ça Parle
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export const newsletterService = {
    async send(
        subject: string,
        htmlBody: string,
        options: { testOnly?: boolean; recipientIds?: string[] } = {}
    ): Promise<{ sent: number; failed: number; total: number; testOnly?: boolean }> {
        return await callFunction(FUNCTIONS.SEND_NEWSLETTER, { subject, htmlBody, ...options });
    },

    async unsubscribe(userId: string, token: string): Promise<void> {
        await callFunction(FUNCTIONS.UNSUBSCRIBE_NEWSLETTER, { userId, token });
    },
};
// src/features/console/services/platformService.ts — Vanessa
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export type Severity = 'critical' | 'warning' | 'info';

export interface Overview {
    generatedAt: string;
    metrics: {
        usersTotal: number | null;
        usersNew24h: number | null;
        usersNew7d: number | null;
        storiesNew24h: number | null;
        commentsNew24h: number | null;
        messagesNew24h: number | null;
        vanessaMessages24h: number | null;
        reportsPending: number | null;
        contributionsPending: number | null;
        lexiconPending: number | null;
    };
    moderators: { id: string; name: string }[];
    eventSummary: { critical: number; warning: number; info: number; total: number; byType: { type: string; count: number }[] } | null;
    unavailable: { metric: string; reason: string }[];
}

export interface FunctionHealth {
    id: string;
    name: string;
    enabled?: boolean;
    timeout?: number;
    total24h?: number;
    sampleSize?: number;
    problemCount?: number;
    lastRunAt?: string | null;
    lastProblem?: { at: string; status: string; statusCode: number; error: string; durationSeconds: number } | null;
    error?: string;
}

export interface PlatformEvent {
    id: string;
    type: string;
    severity: Severity;
    source: string;
    message: string;
    meta: Record<string, unknown>;
    createdAt: string;
}

export const platformService = {
    overview: () => callFunction<Overview>(FUNCTIONS.PLATFORM_OVERVIEW, { action: 'overview' }),
    system: () => callFunction<{ generatedAt: string; functions: FunctionHealth[] }>(FUNCTIONS.PLATFORM_OVERVIEW, { action: 'system' }),
    events: (severity?: Severity) =>
        callFunction<{ events: PlatformEvent[]; notConfigured?: boolean }>(FUNCTIONS.PLATFORM_OVERVIEW, { action: 'events', severity }),
};

export function timeAgo(iso?: string | null): string {
    if (!iso) return '—';
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    return `il y a ${Math.floor(hours / 24)} j`;
}
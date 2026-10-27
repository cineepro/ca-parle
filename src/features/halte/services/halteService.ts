// src/features/halte/services/halteService.ts — HALTE
import { callFunction, FunctionCallError } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export interface AlertPayload {
    forWho: 'self' | 'other' | 'unknown';
    danger: boolean;
    place: string;
    geo: string;
    phone: string;
    callOk: boolean;
    bestTime: string;
    message: string;
    posterCode: string;
    fillMs: number;
    website: string; // champ piège, toujours vide pour une vraie personne
    channel?: 'web' | 'relais';
}

/** Envoie une alerte. Lève { permanent: true } si le service a répondu non (message à montrer), sinon l'erreur réseau d'origine. */
export async function sendAlert(payload: Record<string, unknown>): Promise<string> {
    try {
        const r = await callFunction<{ ref: string }>(FUNCTIONS.HALTE_ALERT, { action: 'submit', ...payload });
        return r.ref;
    } catch (e: any) {
        if (e instanceof FunctionCallError && !/a échoué/.test(e.message)) {
            const err: any = new Error(e.message);
            err.permanent = true;
            throw err;
        }
        throw e; // réseau coupé ou service momentanément indisponible : on garde le message
    }
}

// --- Cellule d'écoute ---
export type AlertStatus = 'nouvelle' | 'en_cours' | 'traitee' | 'sans_suite' | 'test';
export interface AlertRow {
    id: string; ref: string; status: AlertStatus; priority: 'urgent' | 'normale' | 'basse'; danger: boolean; channel: string;
    place: string; hasPhone: boolean; flags: string[]; assignedTo: string; posterCode: string; createdAt: string;
}
export interface TimelineEntry { at: string; by: string; action?: string; text?: string }
export interface AlertDetail {
    id: string; ref: string; status: AlertStatus; priority: 'urgent' | 'normale' | 'basse'; danger: boolean; forWho: string; channel: string;
    posterCode: string; place: string; geo: string; phone: string; callOk: boolean; bestTime: string; message: string; flags: string[];
    assignedTo: string; createdAt: string; updatedAt: string; timeline: TimelineEntry[];
}
export interface HalteStats {
    total: number; openCount: number; openUrgent: number; waitingOver1h: number; medianFirstActionMin: number | null;
    byStatus: Record<string, number>; byChannel: Record<string, number>;
    byPoster: { code: string; n: number }[]; perDay: { day: string; n: number }[]; truncated?: boolean;
}

export const halteCellule = {
    list: (status?: AlertStatus) => callFunction<{ alerts: AlertRow[]; total: number }>(FUNCTIONS.HALTE_ALERT, { action: 'list', status }),
    get: async (id: string) => (await callFunction<{ alert: AlertDetail }>(FUNCTIONS.HALTE_ALERT, { action: 'get', id })).alert,
    update: async (id: string, data: { status?: AlertStatus; note?: string; assignToMe?: boolean }) =>
        (await callFunction<{ alert: AlertDetail }>(FUNCTIONS.HALTE_ALERT, { action: 'update', id, ...data })).alert,
    stats: () => callFunction<HalteStats>(FUNCTIONS.HALTE_ALERT, { action: 'stats' }),
};

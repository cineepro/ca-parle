// src/features/halte/lib/offlineQueue.ts — HALTE
// Sans réseau, le message est gardé sur l'appareil et part tout seul dès que la connexion revient.
export interface QueuedAlert { id: string; payload: Record<string, unknown>; at: number }
const KEY = 'halte:file';

const read = (): QueuedAlert[] => {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
const write = (list: QueuedAlert[]): boolean => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; /* stockage plein */ } };

export const pendingAlerts = (): QueuedAlert[] => read();

/** Garde l'alerte sur l'appareil. Renvoie null si le téléphone n'a plus de place (un message vocal est plus lourd). */
export function queueAlert(payload: Record<string, unknown>): QueuedAlert | null {
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, payload, at: Date.now() };
    return write([...read(), item]) ? item : null;
}

/** Envoie ce qui attend. `send` lève une erreur « réseau » (on s'arrête, on réessaiera) ou renvoie la référence. */
export async function flushQueue(send: (payload: Record<string, unknown>) => Promise<string>): Promise<string[]> {
    const refs: string[] = [];
    for (const item of read()) {
        try {
            refs.push(await send(item.payload));
            write(read().filter((x) => x.id !== item.id));
        } catch (e: any) {
            if (e?.permanent) { write(read().filter((x) => x.id !== item.id)); continue; }
            break; // toujours pas de réseau
        }
    }
    return refs;
}

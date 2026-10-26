// src/features/profile/services/publicProfileCache.ts — Vanessa
// Photo et badge « certifié » des personnes dont le nom s'affiche à l'écran.
// Les demandes sont groupées (une seule requête pour tout ce qui s'affiche au
// même moment) et gardées en mémoire quelques minutes.
import { Query } from 'appwrite';
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/constants';

export interface PublicProfile {
    avatarUrl: string;
    isCertified: boolean;
}

const TTL_MS = 10 * 60 * 1000;
const BATCH_DELAY_MS = 25;
const BATCH_SIZE = 50;

const cache = new Map<string, { value: PublicProfile; at: number }>();
const waiting = new Map<string, Array<(p: PublicProfile) => void>>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
// Si l'attribut isCertified n'existe pas encore côté Appwrite, on le sait après
// le premier refus et on redemande sans lui.
let certifiedSupported = true;

const EMPTY: PublicProfile = { avatarUrl: '', isCertified: false };

export function peekPublicProfile(userId?: string): PublicProfile | undefined {
    if (!userId) return undefined;
    const hit = cache.get(userId);
    return hit && Date.now() - hit.at < TTL_MS ? hit.value : undefined;
}

export function subscribePublicProfiles(fn: () => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

/** Oublie un profil (après changement de photo) pour forcer une relecture. */
export function forgetPublicProfile(userId: string, value?: PublicProfile) {
    if (value) cache.set(userId, { value, at: Date.now() });
    else cache.delete(userId);
    listeners.forEach((l) => l());
}

async function fetchBatch(ids: string[]): Promise<Map<string, PublicProfile>> {
    const out = new Map<string, PublicProfile>();
    const fields = certifiedSupported ? ['$id', 'avatarUrl', 'isCertified'] : ['$id', 'avatarUrl'];
    try {
        const r = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [
            Query.equal('$id', ids),
            Query.select(fields),
            Query.limit(ids.length),
        ]);
        for (const d of r.documents as any[]) {
            out.set(d.$id, { avatarUrl: d.avatarUrl || '', isCertified: d.isCertified === true });
        }
    } catch (err) {
        if (certifiedSupported) {
            certifiedSupported = false;
            return fetchBatch(ids);
        }
        console.warn('[publicProfileCache] lecture impossible :', err);
    }
    return out;
}

async function flush() {
    timer = null;
    const ids = [...waiting.keys()];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const chunk = ids.slice(i, i + BATCH_SIZE);
        const found = await fetchBatch(chunk);
        for (const id of chunk) {
            const value = found.get(id) ?? EMPTY;
            cache.set(id, { value, at: Date.now() });
            (waiting.get(id) ?? []).forEach((cb) => cb(value));
            waiting.delete(id);
        }
    }
    listeners.forEach((l) => l());
}

export function requestPublicProfile(userId: string): Promise<PublicProfile> {
    const hit = peekPublicProfile(userId);
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve) => {
        const list = waiting.get(userId) ?? [];
        list.push(resolve);
        waiting.set(userId, list);
        if (!timer) timer = setTimeout(flush, BATCH_DELAY_MS);
    });
}

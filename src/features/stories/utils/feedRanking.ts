// src/features/stories/utils/feedRanking.ts — Vanessa
// Algorithme du fil "Ça Parle" (version 1, calculé côté appareil).
//
// Principe : chaque histoire reçoit un score, puis le fil est trié par score.
//
//   score = engagement ÷ (âge en heures + 2)^1,4  ×  bonus
//
//   engagement = 3 + réactions + 3 × commentaires + 0,1 × vues
//   → un commentaire pèse plus qu'une réaction (il demande plus d'effort),
//     et la division par l'âge fait descendre les vieilles histoires.
//     Le « 3 » de départ évite qu'une histoire toute neuve, sans réaction,
//     soit enterrée avant d'avoir eu sa chance.
//
//   bonus : confirmée ×1,2 · démentie ×0,6 · très récente ×3 (< 1 h) ou
//           ×1,6 (< 3 h) pour donner sa chance à chaque nouvelle histoire ·
//           déjà vue ×0,25 ·
//           affinité avec ce que la personne lit (catégorie, type, pays).
//
// Puis une passe de variété : jamais 3 histoires de suite de la même
// catégorie, jamais 2 de suite du même auteur (si possible).
//
// Tout se passe dans le navigateur : aucune donnée perso ne quitte l'appareil
// et aucune modification côté serveur n'est nécessaire.

import type { Story } from '../services/storyService';

const PROFILE_KEY = 'vanessa_feed_profile_v1';
const SEEN_KEY = 'vanessa_feed_seen_v1';
const MAX_SEEN = 400;

interface Profile {
    category: Record<string, number>;
    type: Record<string, number>;
    country: Record<string, number>;
}

const emptyProfile = (): Profile => ({ category: {}, type: {}, country: {} });

// ── Stockage local (jamais bloquant : si indisponible, on continue sans) ──

const readJson = <T,>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
};

const writeJson = (key: string, value: unknown) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Stockage plein ou désactivé : le fil fonctionne quand même.
    }
};

const loadProfile = (): Profile => ({ ...emptyProfile(), ...readJson<Partial<Profile>>(PROFILE_KEY, {}) });
const loadSeen = (): string[] => readJson<string[]>(SEEN_KEY, []);

// ── Signaux : ce que la personne fait ─────────────────────────────────────

/**
 * Enregistre un signal d'intérêt pour une histoire.
 * Poids conseillés : 1 = histoire regardée plus d'1,5 s · 3 = réaction ·
 * 4 = histoire ouverte (lecture / commentaires).
 */
export const recordSignal = (story: Pick<Story, 'categoryId' | 'type' | 'country'>, weight: number) => {
    const profile = loadProfile();
    const bump = (bucket: Record<string, number>, key?: string) => {
        if (!key) return;
        // Léger oubli des anciens goûts : le profil suit l'évolution des envies.
        for (const k of Object.keys(bucket)) bucket[k] *= 0.98;
        bucket[key] = (bucket[key] || 0) + weight;
    };
    bump(profile.category, story.categoryId);
    bump(profile.type, story.type);
    bump(profile.country, story.country);
    writeJson(PROFILE_KEY, profile);
};

/** Marque une histoire comme déjà vue (pour la faire descendre au prochain tri). */
export const markSeen = (storyId: string) => {
    const seen = loadSeen();
    if (seen.includes(storyId)) return;
    seen.push(storyId);
    writeJson(SEEN_KEY, seen.slice(-MAX_SEEN));
};

// Une vue ne doit être comptée qu'une fois par session, qu'elle vienne du
// fil plein écran ou de la page de détail.
const countedViews = new Set<string>();
export const claimView = (storyId: string): boolean => {
    if (countedViews.has(storyId)) return false;
    countedViews.add(storyId);
    return true;
};

// ── Score ─────────────────────────────────────────────────────────────────

const affinity = (bucket: Record<string, number>, key?: string): number => {
    if (!key) return 1;
    const total = Object.values(bucket).reduce((a, b) => a + b, 0);
    if (total < 5) return 1; // pas assez de données : on ne personnalise pas encore
    const share = (bucket[key] || 0) / total;
    return 1 + Math.min(0.8, share * 1.6);
};

export const scoreStory = (story: Story, profile: Profile, seen: Set<string>, now = Date.now()): number => {
    const ageHours = Math.max(0, (now - new Date(story.$createdAt).getTime()) / 3_600_000);

    const engagement =
        3 +
        (story.reactionsCount || 0) +
        3 * (story.commentsCount || 0) +
        0.1 * (story.viewCount || 0);

    let score = engagement / Math.pow(ageHours + 2, 1.4);

    if (story.status === 'confirme') score *= 1.2;
    if (story.status === 'dementi') score *= 0.6;
    if (ageHours < 1) score *= 3;
    else if (ageHours < 3) score *= 1.6;
    if (seen.has(story.$id)) score *= 0.25;

    score *=
        affinity(profile.category, story.categoryId) *
        affinity(profile.type, story.type) *
        affinity(profile.country, story.country);

    return score;
};

// ── Tri + variété ─────────────────────────────────────────────────────────

export const rankStories = (stories: Story[]): Story[] => {
    if (stories.length < 2) return stories;

    const profile = loadProfile();
    const seen = new Set(loadSeen());
    const now = Date.now();

    const remaining = stories
        .map((story) => ({ story, score: scoreStory(story, profile, seen, now) }))
        .sort((a, b) => Number(!!b.story.isPinned) - Number(!!a.story.isPinned) || b.score - a.score)
        .map((x) => x.story);

    const result: Story[] = [];
    while (remaining.length > 0) {
        const last = result[result.length - 1];
        const beforeLast = result[result.length - 2];

        let index = remaining.findIndex((candidate) => {
            const sameCategoryThrice =
                !!last && !!beforeLast &&
                candidate.categoryId === last.categoryId &&
                candidate.categoryId === beforeLast.categoryId;
            const sameAuthor = !!last && !candidate.isAnonymous && candidate.authorId === last.authorId;
            return !sameCategoryThrice && !sameAuthor;
        });
        if (index === -1) index = 0; // pas le choix : on garde l'ordre par score

        result.push(remaining.splice(index, 1)[0]);
    }
    return result;
};
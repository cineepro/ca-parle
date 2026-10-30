// src/features/uac/lib/menu.ts — Vanessa
// Le menu est écrit une fois pour la semaine et se répète : on affiche simplement le jour d'aujourd'hui.
// Le Bénin est en UTC+1 toute l'année (pas d'heure d'été) : on calcule le jour et l'heure à Cotonou,
// quel que soit le fuseau du téléphone.
import { DAYS, MEALS, type Day, type MealSlug, type WeekMenu } from '../config';

const BENIN_OFFSET_MS = 3600 * 1000;

function beninNow(now: number) {
    return new Date(now + BENIN_OFFSET_MS); // lire avec getUTC*()
}

export function todayKey(now = Date.now()): Day {
    const jsDay = beninNow(now).getUTCDay(); // 0 = dimanche
    return DAYS[(jsDay + 6) % 7];
}

// Quel repas est « en cours » ou le prochain : matin avant 10 h, midi avant 16 h, soir ensuite.
export function currentMeal(now = Date.now()): MealSlug {
    const h = beninNow(now).getUTCHours();
    if (h < 10) return 'matin';
    if (h < 16) return 'midi';
    return 'soir';
}

export function emptyMenu(): WeekMenu {
    const menu = {} as WeekMenu;
    for (const d of DAYS) menu[d] = { matin: '', midi: '', soir: '' };
    return menu;
}

export function parseSchedule(raw: string | undefined | null): WeekMenu {
    const menu = emptyMenu();
    try {
        const parsed = JSON.parse(raw || '{}');
        for (const d of DAYS) for (const m of MEALS) {
            const v = parsed?.[d]?.[m.slug];
            if (typeof v === 'string') menu[d][m.slug] = v;
        }
    } catch { /* menu vide */ }
    return menu;
}

export const dayLabel = (d: Day) => d.charAt(0).toUpperCase() + d.slice(1);

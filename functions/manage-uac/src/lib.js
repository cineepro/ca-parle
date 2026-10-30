// functions/manage-uac/src/lib.js — Vanessa
// Règles de validation de l'espace UAC, sans accès à la base (donc testables).

export const NEWS_KINDS = ['concours', 'location', 'emploi', 'soutenance', 'excursion', 'autre'];
export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const MEALS = ['matin', 'midi', 'soir'];
export const MAX_NEWS_PER_DAY = 5;

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanMultiline = (v, max) => String(v ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

export function validateNews(input) {
    const kind = String(input?.kind || '');
    if (!NEWS_KINDS.includes(kind)) return { error: 'Choisis un type d’actualité.' };
    const title = clean(input.title, 120);
    const content = cleanMultiline(input.content, 2000);
    if (title.length < 4) return { error: 'Le titre est trop court.' };
    if (content.length < 10) return { error: 'Explique un peu plus (10 caractères minimum).' };
    const eventDate = clean(input.eventDate, 10);
    if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return { error: 'Date invalide.' };
    const imageId = clean(input.imageId, 36);
    if (imageId && !/^[a-zA-Z0-9_.-]{1,36}$/.test(imageId)) return { error: 'Image invalide.' };
    return { value: { kind, title, content, contact: clean(input.contact, 120), eventDate, imageId } };
}

// Menu de la semaine : { lundi: { matin, midi, soir }, ... } — un plat par repas, répété chaque semaine.
export function validateSchedule(input) {
    const out = {};
    for (const day of DAYS) {
        out[day] = {};
        for (const meal of MEALS) out[day][meal] = clean(input?.[day]?.[meal], 120);
    }
    return out;
}

export function validateRestaurant(input) {
    const name = clean(input?.name, 80);
    if (name.length < 2) return { error: 'Le nom du restaurant est obligatoire.' };
    const order = Number.isFinite(Number(input?.order)) ? Math.max(0, Math.min(99, Math.trunc(Number(input.order)))) : 0;
    return {
        value: {
            name,
            place: clean(input?.place, 120),
            order,
            active: input?.active !== false,
            schedule: JSON.stringify(validateSchedule(input?.schedule)),
        },
    };
}

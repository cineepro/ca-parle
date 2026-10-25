// functions/manage-search-sources/src/cards.js — Zem
// Fiches manuelles : nettoyage et validation (pur, testé à part).
import { CATEGORIES } from './validate.js';

export function cleanCard(input) {
    const title = String(input.title || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (title.length < 3) return { error: 'Le titre doit faire au moins 3 caractères.' };
    const text = String(input.text || '').replace(/\r\n/g, '\n').trim().slice(0, 8000);
    if (text.length < 20) return { error: 'Le texte doit faire au moins 20 caractères.' };
    let link = '';
    if (input.link && String(input.link).trim()) {
        try {
            const u = new URL(String(input.link).trim());
            if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocole');
            link = u.toString();
        } catch { return { error: 'Le lien doit commencer par http:// ou https://.' }; }
    }
    const trust = [1, 2, 3].includes(Number(input.trust)) ? Number(input.trust) : 3;
    let publishedAt = '';
    if (input.publishedAt) {
        const t = Date.parse(input.publishedAt);
        if (Number.isNaN(t)) return { error: 'Date invalide.' };
        publishedAt = new Date(t).toISOString();
    }
    return {
        value: {
            title, text, link, trust, publishedAt,
            category: CATEGORIES.includes(input.category) ? input.category : 'autre',
            city: String(input.city || '').trim().slice(0, 60),
        },
    };
}

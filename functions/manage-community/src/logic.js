// functions/manage-community/src/logic.js — Vanessa
// Règles pures (testables sans Appwrite).

export const MAX_SUGGESTION_CHARS = 2000;
export const MIN_SUGGESTION_CHARS = 5;
export const MAX_SUGGESTIONS_PER_DAY = 20;
export const STATUSES = ['nouvelle', 'lue', 'traitee'];

export function cleanSuggestion(content) {
    const text = String(content ?? '').replace(/\r\n/g, '\n').trim();
    if (text.length < MIN_SUGGESTION_CHARS) return { error: 'Écris un peu plus, pour qu’on comprenne ton idée.' };
    return { text: text.slice(0, MAX_SUGGESTION_CHARS) };
}

/** Adresse tapée par l'agent : on enlève les espaces autour et on vérifie qu'elle a la forme d'un e-mail. */
export function cleanEmail(raw) {
    const email = String(raw ?? '').trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Écris l’adresse e-mail en entier (exemple : nom@gmail.com).' };
    return { email, lower: email.toLowerCase() };
}

export function chunk(list, size) {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
}

/**
 * Rapport d'un agent : une ligne par compte enregistré, avec ses propositions.
 * registrations : documents de la collection agent_registrations
 * users : documents users (par $id) ; suggestions : documents vanessa_suggestions
 */
export function buildReport(registrations, usersById, suggestions) {
    const byUser = new Map();
    for (const s of suggestions) {
        if (!byUser.has(s.submittedBy)) byUser.set(s.submittedBy, []);
        byUser.get(s.submittedBy).push(s);
    }
    const accounts = registrations.map((r) => {
        const u = usersById.get(r.userId) || {};
        const mine = (byUser.get(r.userId) || []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return {
            userId: r.userId,
            name: u.name || '',
            email: u.email || '',
            phone: u.phone || '',
            registeredAt: r.registeredAt,
            joinedAt: u.createdAt || u.$createdAt || '',
            hasPhoto: !!u.avatarUrl,
            stories: u.storiesCount || 0,
            comments: u.commentsCount || 0,
            suggestionsCount: mine.length,
            lastSuggestionAt: mine[0]?.createdAt || '',
            // « Actif » : a déjà fait quelque chose sur Vanessa au-delà de l'inscription.
            active: mine.length > 0 || (u.storiesCount || 0) > 0 || (u.commentsCount || 0) > 0,
        };
    }).sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)));
    const all = suggestions
        .map((s) => ({ id: s.$id, userId: s.submittedBy, name: (usersById.get(s.submittedBy) || {}).name || s.submitterName || '', content: s.content, createdAt: s.createdAt }))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return {
        totals: {
            registered: accounts.length,
            active: accounts.filter((a) => a.active).length,
            withSuggestion: accounts.filter((a) => a.suggestionsCount > 0).length,
            suggestions: suggestions.length,
        },
        accounts,
        suggestions: all,
    };
}

// functions/send-message/src/routing.js — Vanessa
// Aiguillage AUTOMATIQUE des questions vers les connecteurs de connaissances (plus de pastilles à choisir).
// Un petit modèle rapide lit la question et choisit 0, 1 ou 2 connecteurs d'après leur nom et leur description.
// Ensuite seules les notes de ces connecteurs sont cherchées (voir knowledgeSearch.js) : jamais toute la base.
export const MAX_ROUTED = 2;
export const NOTEBOOK_CONNECTOR_ID = 'mon-cahier';
const NOTEBOOK_DESCRIPTION = 'Les notes personnelles de la personne : UNIQUEMENT quand elle parle explicitement de ses notes, de son cahier, ou de ce qu\'elle a écrit ou enregistré avant.';
const ROUTER_MODEL = process.env.VANESSA_ROUTER_MODEL || 'claude-haiku-4-5-20251001';

const normalize = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Messages de simple politesse ou de bavardage : inutile de payer un aiguillage.
const SMALL_TALK = new Set('salut bonjour bonsoir coucou hello hey yo merci ok oui non d accord daccord ca va cc wesh mdr lol super top vanessa et toi bien comment tu vas bye ciao a plus bisous'.split(' '));
export function shouldSkipRouting(message) {
    const words = normalize(message).split(' ').filter(Boolean);
    if (words.length === 0) return true;
    return words.length <= 5 && words.every((w) => SMALL_TALK.has(w));
}

/** Connecteurs utilisables : actifs et dont le quota n'est pas épuisé. « Mon cahier » garde une description fixe. */
export function routingCatalog(connectors) {
    return connectors
        .filter((c) => c.active !== false && !((c.tokensGranted || 0) > 0 && (c.tokensUsed || 0) >= c.tokensGranted))
        .map((c) => ({
            doc: c,
            name: String(c.name || c.$id),
            description: c.$id === NOTEBOOK_CONNECTOR_ID ? NOTEBOOK_DESCRIPTION : String(c.description || 'sans description').replace(/\s+/g, ' ').slice(0, 200),
        }));
}

export function buildRoutingSystem(catalog, max = MAX_ROUTED) {
    return `Tu es un aiguilleur. Voici les thèmes de connaissances disponibles, numérotés. Lis le dernier message de la personne (et le contexte) puis réponds UNIQUEMENT avec le ou les numéros des thèmes dont les connaissances aident vraiment à répondre, du plus au moins pertinent, séparés par des virgules, maximum ${max}. Si le message est une discussion générale, une question sans rapport avec un thème, ou si tu hésites, réponds exactement : AUCUN.\n\nThèmes :\n${catalog.map((c, i) => `${i + 1}. ${c.name} — ${c.description}`).join('\n')}`;
}

/** « 2, 5 » → [1, 4] (positions dans le catalogue). « AUCUN », texte illisible ou numéros hors liste → []. */
export function parseRoutingAnswer(raw, size, max = MAX_ROUTED) {
    const text = String(raw || '');
    if (/aucun/i.test(text)) return [];
    const picked = [];
    for (const m of text.match(/\d+/g) || []) {
        const i = parseInt(m, 10) - 1;
        if (i >= 0 && i < size && !picked.includes(i)) picked.push(i);
        if (picked.length >= max) break;
    }
    return picked;
}

/** « Mon cahier » ne se mélange jamais avec d'autres sources : s'il est choisi, il est seul. */
export function exclusiveNotebook(docs) {
    const notebook = docs.find((d) => d.$id === NOTEBOOK_CONNECTOR_ID);
    return notebook ? [notebook] : docs;
}

/** Répartit la consommation de jetons entre les connecteurs qui ont réellement servi. */
export function splitTokens(total, count) {
    if (count <= 0) return [];
    const base = Math.floor(total / count);
    return Array.from({ length: count }, (_, i) => base + (i === 0 ? total - base * count : 0));
}

/**
 * Choisit les connecteurs pour ce message. Ne lève jamais d'erreur : au moindre souci → aucun connecteur
 * (Vanessa répond alors avec la base générale). Renvoie { picked: [docs], tokens }.
 */
export async function routeConnectors({ connectors, history, vanessaId, apiKey, fetchImpl = fetch, log = () => {} }) {
    const catalog = routingCatalog(connectors);
    if (catalog.length === 0) return { picked: [], tokens: 0 };
    const userMessages = history.filter((m) => m.senderId !== vanessaId).map((m) => String(m.content || '').replace(/\s+/g, ' ').trim());
    const last = userMessages[userMessages.length - 1] || '';
    const before = userMessages.slice(-4, -1).map((t) => `- ${t.slice(0, 250)}`).join('\n');
    const lastReply = [...history].reverse().find((m) => m.senderId === vanessaId)?.content || '';
    const content = `Message : ${last.slice(0, 600)}${before ? `\n\nMessages précédents de la personne :\n${before}` : ''}${lastReply ? `\n\nDernière réponse de l'assistante : ${String(lastReply).replace(/\s+/g, ' ').slice(0, 200)}` : ''}`;
    try {
        const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: ROUTER_MODEL, system: buildRoutingSystem(catalog), messages: [{ role: 'user', content }], max_tokens: 20 }),
        });
        if (!response.ok) { log(`⚠️ Aiguillage impossible (${response.status}) — base générale.`); return { picked: [], tokens: 0 }; }
        const data = await response.json();
        const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
        const raw = data.content?.find((b) => b.type === 'text')?.text?.trim() || '';
        const indices = parseRoutingAnswer(raw, catalog.length);
        const picked = exclusiveNotebook(indices.map((i) => catalog[i].doc));
        log(`🧭 Aiguillage : « ${raw.slice(0, 40)} » → ${picked.length ? picked.map((d) => d.name || d.$id).join(' + ') : 'base générale'} (${tokens} jetons)`);
        return { picked, tokens };
    } catch (err) {
        log(`⚠️ Aiguillage impossible : ${err.message} — base générale.`);
        return { picked: [], tokens: 0 };
    }
}

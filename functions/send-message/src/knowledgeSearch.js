// functions/send-message/src/knowledgeSearch.js — Vanessa
// Recherche dans une base de notes (un connecteur, ou la base générale), sans jamais tout charger :
//   1. on extrait les mots utiles de la question (sans mots vides) ;
//   2. la base cherche chacun de ces mots dans `content` ET dans `keywords` ;
//   3. les notes sont classées par nombre de mots trouvés ;
//   4. on complète avec les plus récentes (l'actualité fraîche n'est jamais ratée).
// Le tri de pertinence final (un petit appel à Claude) reste dans main.js.
// Si la recherche ne trouve rien (ou échoue : index manquant…), on retombe sur les notes les plus récentes.
import { Query } from 'node-appwrite';

export const MAX_SEARCH_WORDS = 5;
export const SEARCH_PER_QUERY = 12; // résultats lus par mot et par attribut
export const SEARCH_CANDIDATES = 40; // meilleures notes trouvées par la recherche
export const RECENT_AFTER_SEARCH = 20; // + les plus récentes, quand la recherche a trouvé quelque chose
export const CANDIDATE_POOL = 60; // taille du lot soumis au tri de pertinence

export const SEARCH_STOP_WORDS = new Set((
    'alors,aucun,aussi,autre,autres,avant,avec,avez,avoir,bonjour,bonsoir,cela,celle,celui,ceux,chaque,chose,choses,comme,comment,' +
    'connais,dans,dire,dis,dites,doit,donc,donne,donner,dont,elle,elles,encore,entre,est,etes,etre,être,été,ete,étaient,était,' +
    'faire,fait,faut,fois,hello,ici,info,infos,information,informations,juste,leur,leurs,lors,mais,merci,même,meme,moins,mon,' +
    'notre,nous,nos,parce,pas,peu,peut,peux,please,plus,pour,pourquoi,pourrais,pourriez,pouvez,quand,quel,quelle,quelles,quels,' +
    'quelque,quelques,question,questions,quoi,renseignement,renseignements,salut,sans,savoir,sais,sera,seulement,ses,sont,sous,' +
    'stp,suis,sommes,svp,tes,toi,ton,tous,tout,toute,toutes,très,tres,une,vais,vanessa,vas,veux,vers,voudrais,voulais,vos,votre,' +
    'vous,ces,cet,cette,des,deux,les,que,qui,sur,aux,par,mes,moi,ils,eux,ont,pouvoir,besoin,aller,allez,donnez,dites-moi'
).split(','));

export function tokenizeForSearch(text) {
    return String(text || '').toLowerCase().replace(/[’'`]/g, ' ').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// Mots utiles d'un message : sans mots vides ni mots du nom du connecteur
// (« uac » dans le connecteur UAC ne trie rien), les plus longs d'abord.
export function extractSearchWords(text, excludeText = '') {
    const exclude = new Set(tokenizeForSearch(excludeText));
    const seen = new Set();
    const words = [];
    for (const w of tokenizeForSearch(text)) {
        if (w.length < 3 || SEARCH_STOP_WORDS.has(w) || exclude.has(w) || seen.has(w)) continue;
        seen.add(w);
        words.push(w);
    }
    return words.sort((a, b) => b.length - a.length).slice(0, MAX_SEARCH_WORDS);
}

const byRecent = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));

/**
 * `bases` : une liste de « variantes » de filtres (chaque variante = tableau de Query). Un connecteur n'en a qu'une ;
 * la base générale en a deux (connectorId vide, ET connectorId absent des anciennes notes). Une variante que la
 * base refuse (ex. isNull non permis sur certains plans) est simplement laissée de côté.
 * `pool` : nombre maximum de notes rendues (60 pour un seul sujet, 30 chacun quand deux sujets se partagent le lot).
 */
export async function findKnowledgeCandidates({ databases, DATABASE_ID, COLLECTION, bases, excludeText = '', history, VANESSA_USER_ID, pool = CANDIDATE_POOL, label = '', log = () => {} }) {
    const searchedMax = Math.min(SEARCH_CANDIDATES, pool);
    const recentMax = Math.min(RECENT_AFTER_SEARCH, pool);

    // Variantes utilisables : on mesure chacune (taille totale) ; celles qui échouent sont écartées.
    const probes = await Promise.all(bases.map((b) =>
        databases.listDocuments(DATABASE_ID, COLLECTION, [...b, Query.limit(1)]).then((r) => ({ base: b, total: r.total })).catch(() => null)));
    const variants = probes.filter(Boolean);
    if (variants.length === 0) return [];

    const recent = async (n) => {
        const lists = await Promise.all(variants.map((v) =>
            databases.listDocuments(DATABASE_ID, COLLECTION, [...v.base, Query.orderDesc('createdAt'), Query.limit(n)]).then((r) => r.documents).catch(() => [])));
        const seen = new Set();
        return lists.flat().filter((d) => (seen.has(d.$id) ? false : seen.add(d.$id))).sort(byRecent).slice(0, n);
    };

    // Mots de la question ; si elle est très courte ("et les frais ?"), on
    // ajoute ceux du message précédent de la personne, qui porte le sujet.
    const userMessages = history.filter((m) => m.senderId !== VANESSA_USER_ID).map((m) => m.content || '');
    const last = userMessages[userMessages.length - 1] || '';
    const previous = userMessages[userMessages.length - 2] || '';
    let words = extractSearchWords(last, excludeText);
    if (words.length < 3 && previous) {
        words = [...new Set([...words, ...extractSearchWords(previous, excludeText)])].slice(0, MAX_SEARCH_WORDS);
    }
    if (words.length === 0) {
        log(`🔎 Recherche ${label} : aucun mot utile dans la question — ${pool} notes les plus récentes.`);
        return recent(pool);
    }

    const attributes = ['content', 'keywords'];
    const found = await Promise.all(variants.flatMap((v, vi) => words.flatMap((w) => attributes.map((attr) =>
        databases.listDocuments(DATABASE_ID, COLLECTION, [...v.base, Query.search(attr, w), Query.limit(SEARCH_PER_QUERY)])
            .then((r) => ({ vi, w, attr, r }))
            .catch((err) => ({ vi, w, attr, err }))))));

    // Un mot présent dans la moitié des notes d'une variante ne départage rien : ignoré.
    const genericWords = new Set();
    for (const f of found) {
        const total = variants[f.vi].total;
        if (f.r && total >= 20 && f.r.total >= total * 0.5) genericWords.add(f.w);
    }

    const scored = new Map();
    const failedAttrs = new Map();
    const hitsPerWord = {};
    for (const f of found) {
        if (f.err) { failedAttrs.set(f.attr, f.err.message || String(f.err)); continue; }
        if (genericWords.has(f.w)) continue;
        hitsPerWord[`${f.w}/${f.attr}`] = (hitsPerWord[`${f.w}/${f.attr}`] || 0) + f.r.total;
        for (const d of f.r.documents) {
            const entry = scored.get(d.$id) || { doc: d, score: 0 };
            entry.score += f.attr === 'keywords' ? 1.5 : 1; // un mot-clé écrit exprès pèse un peu plus
            scored.set(d.$id, entry);
        }
    }
    for (const [attr, msg] of failedAttrs) {
        log(`⚠️ Recherche ${label} : échec sur « ${attr} » (${String(msg).slice(0, 140)}) — index fulltext manquant ?`);
    }

    const searched = [...scored.values()]
        .sort((a, b) => b.score - a.score || byRecent(a.doc, b.doc))
        .slice(0, searchedMax)
        .map((x) => x.doc);

    const total = variants.reduce((n, v) => n + v.total, 0);
    if (searched.length === 0) {
        log(`🔎 Recherche ${label} : mots [${words.join(', ')}] — rien trouvé${genericWords.size ? ` (trop courants : ${[...genericWords].join(', ')})` : ''} — repli sur les ${pool} plus récentes.`);
        return recent(pool);
    }

    const recents = await recent(recentMax);
    const seen = new Set(searched.map((d) => d.$id));
    const merged = [...searched, ...recents.filter((d) => !seen.has(d.$id))].slice(0, pool);
    log(`🔎 Recherche ${label} : mots [${words.join(', ')}]${genericWords.size ? `, ignorés (trop courants) : ${[...genericWords].join(', ')}` : ''} → ${searched.length} note(s) trouvée(s) sur ${total} + ${merged.length - searched.length} récente(s) = ${merged.length} candidates. Résultats par mot : ${JSON.stringify(hitsPerWord)}`);
    return merged;
}

/** Deux sujets se partagent un lot : on alterne leurs meilleures notes, jusqu'au plafond. */
export function interleave(groups, cap) {
    const out = [];
    for (let i = 0; out.length < cap; i += 1) {
        let added = false;
        for (const g of groups) {
            if (i < g.length && out.length < cap) { out.push(g[i]); added = true; }
        }
        if (!added) break;
    }
    return out;
}

// functions/platform-overview/src/main.js — Vanessa
// Réservé aux modérateurs. Alimente la "Console" (supervision).
//   { action: 'overview' }                          -> chiffres clés, files d'attente, modérateurs
//   { action: 'system' }                            -> santé de chaque Function sur 24 h
//   { action: 'events', severity?: 'critical'|'warning'|'info' } -> journal d'événements
//   { action: 'users_search', q }                   -> recherche d'utilisateurs (nom, e-mail, téléphone ou ID) : 10 résultats max
//   { action: 'user_detail', userId }               -> fiche d'un utilisateur
//
// CONFIDENTIALITÉ : cette Function ne renvoie jamais le contenu des
// messages des utilisateurs. Pour les erreurs de Functions, seul le champ
// `errors` (messages d'erreur techniques) est lu — jamais `logs`, qui peut
// contenir des extraits de conversations.
//
// Clé API recommandée pour CETTE Function (lecture seule) : databases.read,
// functions.read, executions.read. Timeout conseillé : 60 s.
import { Client, Databases, Functions, Users, Query } from 'node-appwrite';

const DAY_MS = 24 * 60 * 60 * 1000;


// ── Fiches utilisateurs ─────────────────────────────────────────────────
// Rien n'est listé tant que le modérateur ne cherche pas : une recherche
// = 1 requête + 10 lectures au plus. Le compte Appwrite (Users API, clé
// avec users.read) donne la recherche sans index et la dernière
// connexion ; sans cette permission, on retombe sur la base seule.
const DAY = 24 * 60 * 60 * 1000;

function toSummary(doc, auth) {
    return {
        id: doc.$id,
        name: doc.name || '',
        email: doc.email || auth?.email || '',
        phone: doc.phone || auth?.phone || '',
        avatarUrl: doc.avatarUrl || '',
        createdAt: doc.createdAt || doc.$createdAt,
        isBanned: !!doc.isBanned,
        isModerator: !!doc.isModerator,
    };
}

function buildTags(doc, auth) {
    const now = Date.now();
    const created = new Date(doc.createdAt || doc.$createdAt).getTime();
    const lastSeen = auth?.accessedAt ? new Date(auth.accessedAt).getTime() : null;
    const activity = (doc.storiesCount || 0) + (doc.commentsCount || 0) + (doc.revelationsCount || 0);
    const tags = [];
    if (now - created < 7 * DAY) tags.push('Nouveau (moins de 7 jours)');
    if (lastSeen !== null) {
        if (now - lastSeen > 30 * DAY) tags.push('Inactif depuis plus de 30 jours');
        else if (now - lastSeen < 7 * DAY) tags.push('Actif cette semaine');
    }
    if (activity === 0) tags.push('Lecteur (n\'a rien publié)');
    else if (activity >= 10) tags.push('Contributeur régulier');
    if (doc.isCreative) tags.push('Créateur');
    if (doc.isVerified) tags.push('Vérifié');
    if (doc.isModerator) tags.push('Modérateur');
    if (doc.isBanned) tags.push('Banni');
    if (doc.newsletterOptOut) tags.push('Newsletter désactivée');
    return tags;
}

async function fetchProfiles(databases, DATABASE_ID, USERS, ids) {
    const docs = await Promise.all(ids.map((id) => databases.getDocument(DATABASE_ID, USERS, id).catch(() => null)));
    return docs;
}

export default async ({ req, res, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) {
        return res.json({ success: false, error: 'Authentification requise.' }, 401);
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const functions = new Functions(client);
    const usersApi = new Users(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const C = {
        USERS: process.env.COLLECTION_USERS,
        STORIES: process.env.COLLECTION_STORIES,
        COMMENTS: process.env.COLLECTION_COMMENTS,
        MESSAGES: process.env.COLLECTION_MESSAGES,
        REPORTS: process.env.COLLECTION_REPORTS,
        LOCAL_SPOTS: process.env.COLLECTION_LOCAL_SPOTS,
        MARKET_PRICES: process.env.COLLECTION_MARKET_PRICES,
        KNOWLEDGE: process.env.COLLECTION_VANESSA_KNOWLEDGE,
        EVENTS: process.env.COLLECTION_APP_EVENTS,
    };
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;

    try {
        const callerUser = await databases.getDocument(DATABASE_ID, C.USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const now = Date.now();
        const since24 = new Date(now - DAY_MS).toISOString();
        const since7d = new Date(now - 7 * DAY_MS).toISOString();

        switch (body.action) {
            case 'overview': {
                // Chaque chiffre est isolé : si un index manque sur une
                // collection, seul CE chiffre est indisponible (et on dit
                // pourquoi), pas toute la page.
                const unavailable = [];
                // Appwrite ne compte PAS au-delà de 5000 : `total` reste figé
                // à 5000 même si la collection en contient davantage. Quand ce
                // plafond est atteint, on recompte par tranches de dates
                // (chaque tranche restant sous le plafond) et on additionne.
                const COUNT_CAP = 5000;
                const countBand = async (collection, queries, fromIso, toIso, depth) => {
                    const r = await databases.listDocuments(DATABASE_ID, collection, [
                        ...queries, Query.greaterThanEqual('createdAt', fromIso), Query.lessThan('createdAt', toIso), Query.limit(1),
                    ]);
                    const spanMs = Date.parse(toIso) - Date.parse(fromIso);
                    if (r.total < COUNT_CAP || depth >= 20 || spanMs <= 1000) return r.total;
                    const mid = new Date(Date.parse(fromIso) + spanMs / 2).toISOString();
                    const [a, b] = await Promise.all([
                        countBand(collection, queries, fromIso, mid, depth + 1),
                        countBand(collection, queries, mid, toIso, depth + 1),
                    ]);
                    return a + b;
                };
                const countBeyondCap = async (collection, queries) => {
                    const first = await databases.listDocuments(DATABASE_ID, collection, [...queries, Query.orderAsc('createdAt'), Query.limit(1)]);
                    const start = first.documents[0]?.createdAt;
                    if (!start) return COUNT_CAP;
                    return countBand(collection, queries, start, new Date(now + 1000).toISOString(), 0);
                };
                const count = async (metric, collection, queries) => {
                    if (!collection) { unavailable.push({ metric, reason: 'Variable de collection absente.' }); return null; }
                    try {
                        const r = await databases.listDocuments(DATABASE_ID, collection, [...queries, Query.limit(1)]);
                        if (r.total < COUNT_CAP) return r.total;
                        try {
                            // max() : si des anciens documents n'avaient pas de
                            // createdAt, la somme des tranches les oublierait.
                            return Math.max(r.total, await countBeyondCap(collection, queries));
                        } catch (bandErr) {
                            unavailable.push({ metric, reason: `Plafonné à ${COUNT_CAP} (recomptage impossible : ${String(bandErr.message).slice(0, 100)})` });
                            return r.total;
                        }
                    } catch (e) {
                        unavailable.push({ metric, reason: String(e.message).slice(0, 140) });
                        return null;
                    }
                };

                const [
                    usersTotal, usersNew24h, usersNew7d, storiesNew24h, commentsNew24h,
                    messagesNew24h, vanessaMessages24h, reportsPending, spotsPending, pricesPending, lexiconPending,
                ] = await Promise.all([
                    count('usersTotal', C.USERS, []),
                    count('usersNew24h', C.USERS, [Query.greaterThan('createdAt', since24)]),
                    count('usersNew7d', C.USERS, [Query.greaterThan('createdAt', since7d)]),
                    count('storiesNew24h', C.STORIES, [Query.greaterThan('createdAt', since24)]),
                    count('commentsNew24h', C.COMMENTS, [Query.greaterThan('createdAt', since24)]),
                    count('messagesNew24h', C.MESSAGES, [Query.greaterThan('createdAt', since24)]),
                    count('vanessaMessages24h', C.MESSAGES, [Query.equal('senderId', VANESSA_USER_ID), Query.greaterThan('createdAt', since24)]),
                    count('reportsPending', C.REPORTS, [Query.equal('status', 'en_attente')]),
                    count('spotsPending', C.LOCAL_SPOTS, [Query.equal('moderationStatus', 'attente')]),
                    count('pricesPending', C.MARKET_PRICES, [Query.equal('moderationStatus', 'attente')]),
                    count('lexiconPending', C.KNOWLEDGE, [Query.equal('category', 'lexique'), Query.equal('active', false)]),
                ]);

                // Qui a le rôle modérateur — utile pour repérer d'un coup
                // d'œil un compte qui n'aurait rien à y faire.
                let moderators = [];
                try {
                    const m = await databases.listDocuments(DATABASE_ID, C.USERS, [Query.equal('isModerator', true), Query.limit(25)]);
                    moderators = m.documents.map((u) => ({ id: u.$id, name: u.name }));
                } catch (e) {
                    unavailable.push({ metric: 'moderators', reason: String(e.message).slice(0, 140) });
                }

                let eventSummary = null;
                if (C.EVENTS) {
                    try {
                        const ev = await databases.listDocuments(DATABASE_ID, C.EVENTS, [
                            Query.greaterThan('createdAt', since24), Query.orderDesc('createdAt'), Query.limit(200),
                        ]);
                        const bySeverity = { critical: 0, warning: 0, info: 0 };
                        const byType = {};
                        for (const d of ev.documents) {
                            bySeverity[d.severity] = (bySeverity[d.severity] || 0) + 1;
                            byType[d.type] = (byType[d.type] || 0) + 1;
                        }
                        eventSummary = {
                            ...bySeverity,
                            total: ev.total,
                            byType: Object.entries(byType).map(([type, n]) => ({ type, count: n })).sort((a, b) => b.count - a.count).slice(0, 6),
                        };
                    } catch (e) {
                        unavailable.push({ metric: 'events', reason: String(e.message).slice(0, 140) });
                    }
                }

                return res.json({
                    success: true,
                    generatedAt: new Date().toISOString(),
                    metrics: {
                        usersTotal, usersNew24h, usersNew7d, storiesNew24h, commentsNew24h,
                        messagesNew24h, vanessaMessages24h, reportsPending,
                        contributionsPending: (spotsPending ?? 0) + (pricesPending ?? 0),
                        lexiconPending,
                    },
                    moderators,
                    eventSummary,
                    unavailable,
                });
            }

            case 'system': {
                // Santé de chaque Function sur 24 h. Un échec "avalé" par
                // une Function (ex : Vanessa qui n'a pas pu répondre mais
                // renvoie quand même 200) n'apparaît PAS ici — c'est le rôle
                // du journal d'événements. Ici : plantages, délais dépassés
                // et réponses 5xx.
                const list = await functions.list([Query.limit(100)]);
                const results = await Promise.all(list.functions.map(async (fn) => {
                    const base = { id: fn.$id, name: fn.name, enabled: fn.enabled, timeout: fn.timeout };
                    try {
                        const ex = await functions.listExecutions(fn.$id, [
                            Query.greaterThan('$createdAt', since24), Query.orderDesc('$createdAt'), Query.limit(100),
                        ]);
                        const sample = ex.executions;
                        const problems = sample.filter((e) => e.status === 'failed' || (e.responseStatusCode || 0) >= 500);
                        const last = problems[0];
                        return {
                            ...base,
                            total24h: ex.total,
                            sampleSize: sample.length,
                            problemCount: problems.length,
                            lastRunAt: sample[0]?.$createdAt || null,
                            lastProblem: last ? {
                                at: last.$createdAt,
                                status: last.status,
                                statusCode: last.responseStatusCode,
                                error: String(last.errors || '').slice(0, 300),
                                durationSeconds: Math.round((last.duration || 0) * 10) / 10,
                            } : null,
                        };
                    } catch (e) {
                        return { ...base, error: String(e.message).slice(0, 140) };
                    }
                }));
                results.sort((a, b) => (b.problemCount || 0) - (a.problemCount || 0) || a.name.localeCompare(b.name));
                return res.json({ success: true, generatedAt: new Date().toISOString(), functions: results });
            }

            case 'events': {
                if (!C.EVENTS) {
                    return res.json({ success: true, events: [], notConfigured: true });
                }
                const r = await databases.listDocuments(DATABASE_ID, C.EVENTS, [
                    Query.orderDesc('createdAt'), Query.limit(200),
                ]);
                let docs = r.documents;
                if (body.severity) docs = docs.filter((d) => d.severity === body.severity);
                const events = docs.slice(0, 100).map((d) => {
                    let meta = {};
                    try { meta = JSON.parse(d.meta || '{}'); } catch { /* meta illisible : on l'ignore */ }
                    return { id: d.$id, type: d.type, severity: d.severity, source: d.source, message: d.message, meta, createdAt: d.createdAt };
                });
                return res.json({ success: true, events });
            }


            case 'users_search': {
                const q = String(body.q || '').trim().slice(0, 100);
                if (q.length < 2) {
                    return res.json({ success: false, error: 'Tape au moins 2 caractères.' });
                }
                let users = [];
                let source = 'comptes';
                try {
                    // Recherche sur nom, e-mail, téléphone et ID, sans index à créer.
                    const r = await usersApi.list([Query.limit(10)], q);
                    const profiles = await fetchProfiles(databases, DATABASE_ID, C.USERS, r.users.map((u) => u.$id));
                    users = r.users.map((u, i) => profiles[i] ? toSummary(profiles[i], u) : {
                        id: u.$id, name: u.name || '', email: u.email || '', phone: u.phone || '',
                        avatarUrl: '', createdAt: u.registration, isBanned: false, isModerator: false,
                    });
                } catch (e) {
                    // Clé sans users.read : on cherche dans la base.
                    source = 'profils';
                    const seen = new Map();
                    const add = (docs) => docs.forEach((d) => d && seen.set(d.$id, d));
                    if (/^[A-Za-z0-9_.-]{20,36}$/.test(q)) {
                        add([await databases.getDocument(DATABASE_ID, C.USERS, q).catch(() => null)]);
                    }
                    if (q.includes('@')) {
                        add((await databases.listDocuments(DATABASE_ID, C.USERS, [Query.equal('email', q.toLowerCase()), Query.limit(10)]).catch(() => ({ documents: [] }))).documents);
                    }
                    add((await databases.listDocuments(DATABASE_ID, C.USERS, [Query.search('name', q), Query.limit(10)]).catch(() => ({ documents: [] }))).documents);
                    users = [...seen.values()].slice(0, 10).map((d) => toSummary(d, null));
                }
                return res.json({ success: true, users, source });
            }

            case 'user_detail': {
                const userId = String(body.userId || '').trim();
                if (!userId) return res.json({ success: false, error: 'Utilisateur manquant.' });
                let doc;
                try {
                    doc = await databases.getDocument(DATABASE_ID, C.USERS, userId);
                } catch {
                    return res.json({ success: false, error: 'Profil introuvable.' });
                }
                let auth = null;
                try { auth = await usersApi.get(userId); } catch { /* sans users.read : pas de dernière connexion */ }
                return res.json({
                    success: true,
                    user: {
                        ...toSummary(doc, auth),
                        bio: doc.bio || '',
                        balance: doc.balance ?? 0,
                        followers: doc.followers ?? 0,
                        following: doc.following ?? 0,
                        isVerified: !!doc.isVerified,
                        isCreative: !!doc.isCreative,
                        gossipLevel: doc.gossipLevel ?? 0,
                        reputationScore: doc.reputationScore ?? 0,
                        reliabilityIndex: doc.reliabilityIndex ?? 0,
                        storiesCount: doc.storiesCount ?? 0,
                        revelationsCount: doc.revelationsCount ?? 0,
                        commentsCount: doc.commentsCount ?? 0,
                        predictionsCorrect: doc.predictionsCorrect ?? 0,
                        predictionsTotal: doc.predictionsTotal ?? 0,
                        defaultAnonymous: !!doc.defaultAnonymous,
                        newsletterOptOut: !!doc.newsletterOptOut,
                        emailVerified: auth ? !!auth.emailVerification : null,
                        accountStatus: auth ? (auth.status ? 'actif' : 'bloqué') : null,
                        lastAccessAt: auth?.accessedAt || null,
                        tags: buildTags(doc, auth),
                    },
                });
            }

            default:
                return res.json({ success: false, error: `Action inconnue : ${body.action}` }, 400);
        }
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
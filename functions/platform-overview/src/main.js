// functions/platform-overview/src/main.js — Vanessa
// Réservé aux modérateurs. Alimente la "Console" (supervision).
//   { action: 'overview' }                          -> chiffres clés, files d'attente, modérateurs
//   { action: 'system' }                            -> santé de chaque Function sur 24 h
//   { action: 'events', severity?: 'critical'|'warning'|'info' } -> journal d'événements
//
// CONFIDENTIALITÉ : cette Function ne renvoie jamais le contenu des
// messages des utilisateurs. Pour les erreurs de Functions, seul le champ
// `errors` (messages d'erreur techniques) est lu — jamais `logs`, qui peut
// contenir des extraits de conversations.
//
// Clé API recommandée pour CETTE Function (lecture seule) : databases.read,
// functions.read, executions.read. Timeout conseillé : 60 s.
import { Client, Databases, Functions, Query } from 'node-appwrite';

const DAY_MS = 24 * 60 * 60 * 1000;

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
                const count = async (metric, collection, queries) => {
                    if (!collection) { unavailable.push({ metric, reason: 'Variable de collection absente.' }); return null; }
                    try {
                        const r = await databases.listDocuments(DATABASE_ID, collection, [...queries, Query.limit(1)]);
                        return r.total;
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

            default:
                return res.json({ success: false, error: `Action inconnue : ${body.action}` }, 400);
        }
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
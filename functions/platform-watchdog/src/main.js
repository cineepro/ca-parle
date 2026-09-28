// functions/platform-watchdog/src/main.js — Vanessa
// Le veilleur de la plateforme.
//
//  - Exécution PLANIFIÉE (toutes les 15 min, cron "*/15 * * * *") : lance les
//    vérifications, ouvre/met à jour/résout des alertes, prévient les
//    modérateurs (notification dans l'app + push ; email pour les critiques).
//  - Appels HTTP (modérateurs uniquement) depuis la Console :
//      { action: 'run' }                       vérifier maintenant
//      { action: 'list' }                      alertes ouvertes / prises en compte / résolues
//      { action: 'summary' }                   { open, critical } — pastille du menu
//      { action: 'acknowledge', alertId }      prendre une alerte en compte
//
// Une alerte est identifiée par une clé stable (ex : "fn_failing:send-message") :
// tant que le problème dure, on met à jour la MÊME alerte au lieu d'en créer
// une nouvelle toutes les 15 min, et on ne prévient qu'à l'ouverture (ou si
// la gravité augmente). Quand le problème disparaît, l'alerte se résout seule.
//
// Ne lit jamais le contenu des messages : seulement des dates, des
// identifiants et des compteurs.
import { Client, Databases, Functions, Messaging, Query, ID } from 'node-appwrite';
import { Resend } from 'resend';

const MIN = 60 * 1000;
const RANK = { info: 0, warning: 1, critical: 2 };

const EVENT_TITLES = {
    vanessa_reply_failed: "Vanessa n'arrive plus à générer ses réponses",
    tts_failed: 'La voix de Vanessa échoue',
    transcription_failed: 'La transcription des messages vocaux échoue',
    send_message_unhandled: "Erreurs non gérées à l'envoi de messages",
};
const EVENT_HINTS = {
    vanessa_reply_failed: 'Causes fréquentes : crédit Anthropic épuisé, clé invalide, service indisponible.',
    tts_failed: 'Causes fréquentes : crédit ElevenLabs épuisé, clé ou identifiant de voix invalide.',
    transcription_failed: 'Causes fréquentes : crédit ElevenLabs épuisé, format audio non reconnu.',
};
const CHECK_LABELS = {
    vanessa_silent: 'les réponses de Vanessa', fn_failing: 'la santé des Functions', event: 'le journal des incidents',
    connector_quota: 'les quotas des connecteurs', signup_burst: 'les inscriptions', abuse: "l'activité des comptes",
    moderators: 'les comptes modérateurs',
};

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default async ({ req, res, log, error }) => {
    const scheduled = req.headers['x-appwrite-trigger'] === 'schedule';
    const callerId = req.headers['x-appwrite-user-id'];

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    const functions = new Functions(client);
    const messaging = new Messaging(client);

    const DB = process.env.DATABASE_ID;
    const VANESSA = process.env.VANESSA_USER_ID;
    const C = {
        USERS: process.env.COLLECTION_USERS,
        MESSAGES: process.env.COLLECTION_MESSAGES,
        CONVERSATIONS: process.env.COLLECTION_CONVERSATIONS,
        NOTIFICATIONS: process.env.COLLECTION_NOTIFICATIONS,
        EVENTS: process.env.COLLECTION_APP_EVENTS,
        ALERTS: process.env.COLLECTION_PLATFORM_ALERTS,
        CONNECTORS: process.env.COLLECTION_VANESSA_CONNECTORS,
    };
    const SITE_URL = process.env.SITE_URL || 'https://kinemaplus.com';
    const ALERTS_URL = '/moderation?section=alerts';
    const FROM = process.env.ALERT_FROM_EMAIL || process.env.FROM_EMAIL;
    const resend = process.env.RESEND_API_KEY && FROM ? new Resend(process.env.RESEND_API_KEY) : null;

    const nowIso = () => new Date().toISOString();
    const listDocs = async (collection, queries) => (await databases.listDocuments(DB, collection, queries)).documents;

    try {
        if (!C.ALERTS) {
            return res.json({ success: false, error: 'COLLECTION_PLATFORM_ALERTS manquante.' }, 500);
        }

        let callerUser = null;
        if (!scheduled) {
            if (!callerId) return res.json({ success: false, error: 'Authentification requise.' }, 401);
            callerUser = await databases.getDocument(DB, C.USERS, callerId);
            if (!callerUser.isModerator) return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        let body = {};
        try { body = req.bodyJson ?? JSON.parse(req.body || '{}'); } catch { body = {}; }
        const action = scheduled ? 'run' : (body.action || 'run');

        const openAlerts = () => listDocs(C.ALERTS, [Query.equal('status', ['open', 'acknowledged']), Query.limit(200)]);
        const mapAlert = (a) => ({
            id: a.$id, key: a.key, title: a.title, details: a.details, severity: a.severity, status: a.status,
            occurrences: a.occurrences, firstSeenAt: a.firstSeenAt, lastSeenAt: a.lastSeenAt,
            resolvedAt: a.resolvedAt || null, acknowledgedBy: a.acknowledgedBy || null,
        });

        // ---------- Actions de lecture / gestion depuis la Console ----------
        if (action === 'summary') {
            const open = await listDocs(C.ALERTS, [Query.equal('status', 'open'), Query.limit(100)]);
            const real = open.filter((a) => !a.key.startsWith('state:'));
            return res.json({ success: true, open: real.length, critical: real.filter((a) => a.severity === 'critical').length });
        }

        if (action === 'list') {
            const active = (await listDocs(C.ALERTS, [Query.equal('status', ['open', 'acknowledged']), Query.orderDesc('lastSeenAt'), Query.limit(100)]))
                .filter((a) => !a.key.startsWith('state:'));
            active.sort((a, b) => (RANK[b.severity] - RANK[a.severity]) || (b.lastSeenAt > a.lastSeenAt ? 1 : -1));
            const resolved = (await listDocs(C.ALERTS, [Query.equal('status', 'resolved'), Query.orderDesc('lastSeenAt'), Query.limit(40)]))
                .filter((a) => !a.key.startsWith('state:')).slice(0, 15);
            return res.json({ success: true, alerts: [...active, ...resolved].map(mapAlert) });
        }

        if (action === 'acknowledge') {
            if (!body.alertId) return res.json({ success: false, error: 'alertId requis.' }, 400);
            const alert = await databases.getDocument(DB, C.ALERTS, body.alertId);
            await databases.updateDocument(DB, C.ALERTS, body.alertId, {
                status: 'acknowledged', acknowledgedBy: callerUser.name || callerId, acknowledgedAt: nowIso(),
            });
            // Trace de qui a pris quoi en compte (début d'un journal d'actions).
            if (C.EVENTS) {
                await databases.createDocument(DB, C.EVENTS, ID.unique(), {
                    type: 'alert_acknowledged', severity: 'info', source: 'platform-watchdog',
                    message: String(alert.title).slice(0, 300), meta: JSON.stringify({ by: callerId, key: alert.key }),
                    createdAt: nowIso(),
                }).catch(() => {});
            }
            return res.json({ success: true });
        }

        if (action !== 'run') return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);

        // ---------- Vérifications ----------
        let messagesCache = null;
        const recentMessages = async () => {
            if (!messagesCache) {
                messagesCache = await listDocs(C.MESSAGES, [
                    Query.greaterThan('createdAt', new Date(Date.now() - 120 * MIN).toISOString()),
                    Query.orderDesc('createdAt'), Query.limit(200),
                ]);
            }
            return messagesCache;
        };

        const checks = [
            {
                prefix: 'vanessa_silent',
                async run() {
                    const latest = new Map();
                    for (const m of await recentMessages()) if (!latest.has(m.conversationId)) latest.set(m.conversationId, m);
                    const waiting = [...latest.values()].filter((m) =>
                        m.senderId !== VANESSA && m.type !== 'image' && Date.now() - new Date(m.createdAt).getTime() > 10 * MIN,
                    ).slice(0, 20);
                    const silent = [];
                    for (const m of waiting) {
                        try {
                            const conv = await databases.getDocument(DB, C.CONVERSATIONS, m.conversationId);
                            if (conv.participantIds.includes(VANESSA)) silent.push(m);
                        } catch { /* conversation introuvable : on ignore */ }
                    }
                    if (silent.length === 0) return [];
                    const oldest = Math.round((Date.now() - Math.min(...silent.map((m) => new Date(m.createdAt).getTime()))) / MIN);
                    return [{
                        key: 'vanessa_silent',
                        severity: silent.length >= 2 ? 'critical' : 'warning',
                        title: `Vanessa n'a pas répondu dans ${silent.length} conversation(s)`,
                        details: `Le plus ancien message reste sans réponse depuis ${oldest} min. Regarde le Journal : crédit Anthropic, clé invalide ou service indisponible sont les causes les plus fréquentes.`,
                    }];
                },
            },
            {
                prefix: 'fn_failing',
                async run() {
                    const since = new Date(Date.now() - 30 * MIN).toISOString();
                    const list = await functions.list([Query.limit(100)]);
                    const selfId = process.env.APPWRITE_FUNCTION_ID;
                    const out = [];
                    await Promise.all(list.functions.filter((f) => f.$id !== selfId).map(async (fn) => {
                        const ex = await functions.listExecutions(fn.$id, [
                            Query.greaterThan('$createdAt', since), Query.orderDesc('$createdAt'), Query.limit(50),
                        ]);
                        const problems = ex.executions.filter((e) => e.status === 'failed' || (e.responseStatusCode || 0) >= 500);
                        if (problems.length === 0) return;
                        const last = problems[0];
                        const timedOut = fn.timeout && (last.duration || 0) >= fn.timeout - 1;
                        out.push({
                            key: `fn_failing:${fn.name}`,
                            severity: problems.length >= 3 ? 'critical' : 'warning',
                            title: `La Function « ${fn.name} » échoue`,
                            details: `${problems.length} échec(s) sur les 30 dernières minutes. `
                                + (timedOut ? `Délai maximum atteint (${fn.timeout} s) : augmente son timeout. `
                                    : (last.errors ? `Dernière erreur : ${String(last.errors).slice(0, 200)}` : `Dernier code : ${last.responseStatusCode || last.status}.`)),
                        });
                    }));
                    return out;
                },
            },
            {
                prefix: 'event',
                async run() {
                    if (!C.EVENTS) return [];
                    const docs = await listDocs(C.EVENTS, [
                        Query.greaterThan('createdAt', new Date(Date.now() - 30 * MIN).toISOString()),
                        Query.orderDesc('createdAt'), Query.limit(200),
                    ]);
                    const groups = {};
                    for (const d of docs) {
                        if (d.type === 'alert_acknowledged') continue;
                        const g = groups[d.type] || (groups[d.type] = { count: 0, max: 'info', last: d.message });
                        g.count++;
                        if ((RANK[d.severity] || 0) > RANK[g.max]) g.max = d.severity;
                    }
                    return Object.entries(groups)
                        .filter(([, g]) => g.count >= (g.max === 'critical' ? 2 : 3))
                        .map(([type, g]) => ({
                            key: `event:${type}`,
                            severity: g.max,
                            title: EVENT_TITLES[type] || `Incidents répétés : ${type}`,
                            details: `${g.count} occurrences en 30 min. Dernière erreur : ${String(g.last).slice(0, 180)}. ${EVENT_HINTS[type] || ''}`.trim(),
                        }));
                },
            },
            {
                prefix: 'connector_quota',
                async run() {
                    if (!C.CONNECTORS) return [];
                    const conns = await listDocs(C.CONNECTORS, [Query.limit(100)]);
                    const out = [];
                    for (const c of conns) {
                        if (c.active === false || !(c.tokensGranted > 0)) continue;
                        const ratio = (c.tokensUsed || 0) / c.tokensGranted;
                        if (ratio < 0.9) continue;
                        out.push({
                            key: `connector_quota:${c.$id}`,
                            severity: ratio >= 1 ? 'critical' : 'warning',
                            title: ratio >= 1 ? `Connecteur « ${c.name} » épuisé` : `Connecteur « ${c.name} » à ${Math.round(ratio * 100)} % de son quota`,
                            details: ratio >= 1
                                ? 'Il a disparu du chat : le partenaire ne bénéficie plus du service. Recharge-le depuis Console → Connecteurs.'
                                : 'Prévois une recharge depuis Console → Connecteurs avant épuisement.',
                        });
                    }
                    return out;
                },
            },
            {
                prefix: 'signup_burst',
                async run() {
                    const limit = parseInt(process.env.WATCHDOG_SIGNUP_BURST || '30', 10);
                    const r = await databases.listDocuments(DB, C.USERS, [
                        Query.greaterThan('createdAt', new Date(Date.now() - 60 * MIN).toISOString()), Query.limit(1),
                    ]);
                    return r.total >= limit ? [{
                        key: 'signup_burst', severity: 'warning',
                        title: `Pic d'inscriptions : ${r.total} en 1 h`,
                        details: "Vérifie qu'il ne s'agit pas de comptes créés automatiquement.",
                    }] : [];
                },
            },
            {
                prefix: 'abuse',
                async run() {
                    const limit = parseInt(process.env.WATCHDOG_MSG_PER_HOUR || '40', 10);
                    const since = Date.now() - 60 * MIN;
                    const counts = {};
                    for (const m of await recentMessages()) {
                        if (m.senderId !== VANESSA && new Date(m.createdAt).getTime() > since) counts[m.senderId] = (counts[m.senderId] || 0) + 1;
                    }
                    const out = [];
                    for (const [id, n] of Object.entries(counts).filter(([, n]) => n > limit).sort((a, b) => b[1] - a[1]).slice(0, 3)) {
                        let name = id;
                        try { name = (await databases.getDocument(DB, C.USERS, id)).name || id; } catch { /* nom inconnu */ }
                        out.push({
                            key: `abuse:${id}`, severity: 'warning',
                            title: `Activité inhabituelle : ${name}`,
                            details: `${n} messages en 1 h (seuil ${limit}). Vérifie qu'il ne s'agit pas d'un abus ou d'un compte piraté.`,
                        });
                    }
                    return out;
                },
            },
        ];

        const moderators = await listDocs(C.USERS, [Query.equal('isModerator', true), Query.limit(25)]);
        const open = await openAlerts();
        const openByKey = new Map(open.map((a) => [a.key, a]));

        const findings = [];
        const okPrefixes = [];
        const failedChecks = [];
        for (const check of checks) {
            try {
                findings.push(...await check.run());
                okPrefixes.push(check.prefix);
            } catch (e) {
                failedChecks.push({ name: check.prefix, message: String(e.message).slice(0, 250) });
                log(`⚠️ Vérification "${check.prefix}" impossible : ${e.message}`);
            }
        }
        // Une vérification qui ne peut pas s'exécuter (index manquant, droit
        // insuffisant...) devient elle-même une alerte, ouverte UNE fois.
        for (const f of failedChecks) {
            findings.push({
                key: `watchdog_check_failed:${f.name}`, severity: 'warning',
                title: `Le veilleur ne peut pas vérifier ${CHECK_LABELS[f.name] || f.name}`,
                details: f.message,
            });
        }
        okPrefixes.push('watchdog_check_failed');

        // Nouveau modérateur : ne se résout JAMAIS seul (il faut la prendre en
        // compte), et la liste de référence est mise à jour aussitôt pour
        // qu'un même compte ne déclenche l'alerte qu'une fois.
        try {
            const ids = moderators.map((m) => m.$id);
            const baseline = (await listDocs(C.ALERTS, [Query.equal('key', 'state:moderators'), Query.limit(1)]))[0];
            if (!baseline) {
                await databases.createDocument(DB, C.ALERTS, ID.unique(), {
                    key: 'state:moderators', title: 'Liste de référence des modérateurs', details: JSON.stringify(ids),
                    severity: 'info', status: 'resolved', occurrences: 0, firstSeenAt: nowIso(), lastSeenAt: nowIso(),
                });
            } else {
                const known = JSON.parse(baseline.details || '[]');
                const added = moderators.filter((m) => !known.includes(m.$id));
                for (const m of added) {
                    findings.push({
                        key: `moderator_added:${m.$id}`, severity: 'critical',
                        title: `Nouveau modérateur : ${m.name}`,
                        details: "Ce compte vient de recevoir le rôle modérateur. Si ce n'est pas toi qui l'as accordé, retire-le dans Appwrite et change tes clés.",
                    });
                }
                if (added.length > 0 || known.length !== ids.length) {
                    await databases.updateDocument(DB, C.ALERTS, baseline.$id, { details: JSON.stringify(ids), lastSeenAt: nowIso() });
                }
            }
        } catch (e) {
            log(`⚠️ Vérification des modérateurs impossible : ${e.message}`);
            findings.push({
                key: 'watchdog_check_failed:moderators', severity: 'warning',
                title: `Le veilleur ne peut pas vérifier ${CHECK_LABELS.moderators}`, details: String(e.message).slice(0, 250),
            });
        }

        // ---------- Notifications ----------
        const notify = async (f) => {
            for (const mod of moderators) {
                try {
                    await databases.createDocument(DB, C.NOTIFICATIONS, ID.unique(), {
                        userId: mod.$id, title: f.title.slice(0, 100), message: f.details.slice(0, 150),
                        url: ALERTS_URL, read: false, createdAt: nowIso(),
                    });
                } catch (e) { log(`⚠️ Notification non créée : ${e.message}`); }
                try {
                    await messaging.createPush(ID.unique(), f.title.slice(0, 100), f.details.slice(0, 150), [], [mod.$id], [], { url: ALERTS_URL });
                } catch (e) { log(`⚠️ Push non envoyé : ${e.message}`); }
                if (f.severity === 'critical' && resend && mod.email) {
                    try {
                        await resend.emails.send({
                            from: FROM, to: mod.email, subject: `[Alerte critique] ${f.title}`,
                            html: `<p><strong>${escapeHtml(f.title)}</strong></p><p>${escapeHtml(f.details)}</p><p><a href="${SITE_URL}${ALERTS_URL}">Ouvrir la console</a></p>`,
                        });
                    } catch (e) { log(`⚠️ Email non envoyé : ${e.message}`); }
                }
            }
        };

        // ---------- Ouverture / mise à jour des alertes ----------
        let created = 0;
        const currentKeys = new Set(findings.map((f) => f.key));
        for (const f of findings) {
            const existing = openByKey.get(f.key);
            if (!existing) {
                await databases.createDocument(DB, C.ALERTS, ID.unique(), {
                    key: f.key, title: f.title.slice(0, 200), details: f.details.slice(0, 1900), severity: f.severity,
                    status: 'open', occurrences: 1, firstSeenAt: nowIso(), lastSeenAt: nowIso(),
                });
                created++;
                await notify(f);
            } else {
                await databases.updateDocument(DB, C.ALERTS, existing.$id, {
                    title: f.title.slice(0, 200), details: f.details.slice(0, 1900), severity: f.severity,
                    occurrences: (existing.occurrences || 1) + 1, lastSeenAt: nowIso(),
                });
                if ((RANK[f.severity] || 0) > (RANK[existing.severity] || 0)) await notify(f); // la gravité vient d'augmenter
            }
        }

        // ---------- Résolution automatique ----------
        let resolved = 0;
        for (const a of open) {
            const managed = okPrefixes.some((p) => a.key === p || a.key.startsWith(`${p}:`));
            if (managed && !currentKeys.has(a.key)) {
                await databases.updateDocument(DB, C.ALERTS, a.$id, { status: 'resolved', resolvedAt: nowIso() });
                resolved++;
            }
        }

        log(`Veilleur : ${findings.length} constat(s), ${created} alerte(s) ouverte(s), ${resolved} résolue(s), ${failedChecks.length} vérification(s) en échec.`);
        return res.json({ success: true, findings: findings.length, created, resolved, failedChecks });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
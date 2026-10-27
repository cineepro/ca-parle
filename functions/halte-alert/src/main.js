// functions/halte-alert/src/main.js — HALTE (Vanessa × U-Report Sèmè-Podji)
// Réception des alertes de violences, et espace de la cellule d'écoute.
//
//   PUBLIC (sans compte) :
//     { action: 'submit', forWho, danger, place, geo, phone, callOk, bestTime, message, posterCode, fillMs, website }
//     { action: 'sms_inbound', secret, from, text }        ← appelé par la passerelle SMS (secret partagé)
//   CELLULE D'ÉCOUTE (compte avec isResponder) :
//     { action: 'list', status?, offset? } · { action: 'get', id } · { action: 'update', id, status?, note?, assignToMe? }
//   CELLULE ou MODÉRATEUR (chiffres seulement, aucune donnée personnelle) :
//     { action: 'stats' }
//   PLANIFIÉ (facultatif) : supprime les alertes closes de plus de HALTE_RETENTION_DAYS jours.
//
// Les e-mails et notifications ne contiennent JAMAIS le détail d'une alerte : seulement sa référence et son urgence.
import { Client, Databases, Query, ID } from 'node-appwrite';
import { Resend } from 'resend';
import { timingSafeEqual } from 'node:crypto';
import {
    STATUSES, OPEN_STATUSES, makeRef, cleanSubmission, triage, deviceHash, phoneKey, normalizePhone,
    parseSms, smsLooksUrgent, appendNote, buildStats, cut,
} from './logic.js';

const SAME_PHONE_WINDOW_H = 72;

const safeEqual = (a, b) => {
    const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
    return x.length === y.length && timingSafeEqual(x, y);
};

export default async ({ req, res, log, error }) => {
    const scheduled = req.headers['x-appwrite-trigger'] === 'schedule';
    const callerId = req.headers['x-appwrite-user-id'];

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    const DB = process.env.DATABASE_ID;
    const USERS = process.env.COLLECTION_USERS;
    const ALERTS = process.env.COLLECTION_HALTE_ALERTS;
    const NOTIFS = process.env.COLLECTION_NOTIFICATIONS; // facultative
    const SALT = process.env.HALTE_SALT || '';
    const SITE_URL = process.env.SITE_URL || '';
    const FROM = process.env.ALERT_FROM_EMAIL || process.env.FROM_EMAIL;
    const resend = process.env.RESEND_API_KEY && FROM ? new Resend(process.env.RESEND_API_KEY) : null;
    const nowIso = () => new Date().toISOString();
    const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

    const notifyResponders = async (alert) => {
        try {
            const responders = (await databases.listDocuments(DB, USERS, [Query.equal('isResponder', true), Query.limit(25)])).documents;
            const urgent = alert.priority === 'urgent';
            const title = urgent ? 'ALERTE URGENTE — HALTE' : 'Nouvelle alerte HALTE';
            const message = `Référence ${alert.ref}. Ouvre l'espace cellule d'écoute pour la lire.`;
            await Promise.allSettled(responders.map(async (r) => {
                if (NOTIFS) {
                    await databases.createDocument(DB, NOTIFS, ID.unique(), {
                        userId: r.$id, title, message, url: '/halte/cellule', read: false, createdAt: nowIso(),
                    });
                }
                if (resend && r.email) {
                    await resend.emails.send({
                        from: FROM, to: r.email, subject: `${title} — ${alert.ref}`,
                        text: `${message}\n\n${SITE_URL}/halte/cellule\n\nPar sécurité, le contenu de l'alerte n'est jamais envoyé par e-mail.`,
                    });
                }
            }));
        } catch (e) {
            error(`halte : notification impossible (${e.message})`);
        }
    };

    try {
        if (!ALERTS) return res.json({ success: false, error: 'Service non configuré.' }, 500);

        // ---------- Passage planifié : conservation limitée ----------
        if (scheduled && !callerId) {
            const days = Number(process.env.HALTE_RETENTION_DAYS || 0);
            if (!days) return res.json({ success: true, purged: 0, note: 'HALTE_RETENTION_DAYS non défini' });
            const old = await databases.listDocuments(DB, ALERTS, [
                Query.equal('status', ['traitee', 'sans_suite', 'test']),
                Query.lessThan('updatedAt', hoursAgo(days * 24)), Query.limit(100),
            ]);
            for (const d of old.documents) await databases.deleteDocument(DB, ALERTS, d.$id).catch(() => {});
            log(`🧹 HALTE : ${old.documents.length} alerte(s) close(s) supprimée(s) (plus de ${days} jours)`);
            return res.json({ success: true, purged: old.documents.length });
        }

        let body = req.bodyJson;
        if (!body) {
            try { body = JSON.parse(req.body || '{}'); } catch { body = Object.fromEntries(new URLSearchParams(String(req.body || ''))); }
        }
        body = body && typeof body === 'object' ? body : {};
        const action = body.action || (body.secret !== undefined || req.query?.secret !== undefined || body.Body !== undefined ? 'sms_inbound' : '');

        // ---------- Public : dépôt d'une alerte ----------
        if (action === 'submit' || action === 'sms_inbound') {
            if (process.env.HALTE_ENABLED !== 'true') {
                return res.json({ success: false, error: "Ce service n'est pas encore ouvert. Si tu es en danger, appelle le 138 ou le 117." });
            }
            let sub;
            let ip = '';
            if (action === 'sms_inbound') {
                const expected = process.env.HALTE_SMS_SECRET || '';
                // Le secret peut venir du corps, d'un en-tête ou de l'adresse (selon ce que la passerelle SMS sait envoyer).
                const given = body.secret || req.headers['x-halte-secret'] || req.query?.secret || '';
                if (!expected || !safeEqual(given, expected)) {
                    return res.json({ success: false, error: 'Non autorisé.' }, 401);
                }
                // Noms de champs courants : Africa's Talking (from/text), Twilio (From/Body), autres (msisdn/message).
                const parsed = parseSms(body.text ?? body.Body ?? body.message);
                if (!parsed) return res.json({ success: true, ignored: true });
                const from = normalizePhone(body.from ?? body.From ?? body.msisdn);
                sub = {
                    forWho: 'unknown', danger: smsLooksUrgent(parsed.message), place: '', geo: '', phone: from, callOk: !!from,
                    bestTime: '', message: parsed.message, posterCode: parsed.posterCode, channel: 'sms', honeypot: '', fillMs: null,
                };
            } else {
                const c = cleanSubmission(body);
                if (c.error) return res.json({ success: false, error: c.error });
                sub = c.value;
                ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
            }

            const hash = action === 'submit' ? deviceHash(SALT, ip, req.headers['user-agent']) : '';
            const key = phoneKey(sub.phone);
            const count = async (queries) => (await databases.listDocuments(DB, ALERTS, [...queries, Query.limit(1), Query.select(['$id'])])).total;
            const ctx = {};
            if (hash) {
                ctx.deviceLastHour = await count([Query.equal('deviceHash', hash), Query.greaterThan('createdAt', hoursAgo(1))]);
                ctx.deviceLastDay = await count([Query.equal('deviceHash', hash), Query.greaterThan('createdAt', hoursAgo(24))]);
            }
            let existing = null;
            if (key.length === 8) {
                const r = await databases.listDocuments(DB, ALERTS, [
                    Query.equal('phoneKey', key), Query.equal('status', OPEN_STATUSES),
                    Query.greaterThan('createdAt', hoursAgo(SAME_PHONE_WINDOW_H)), Query.orderDesc('createdAt'), Query.limit(1),
                ]);
                existing = r.documents[0] || null;
                if (existing) ctx.samePhoneOpen = existing.$id;
            }
            const t = triage(sub, ctx);

            if (t.drop) { // robot évident : on répond comme si de rien n'était, sans rien enregistrer
                return res.json({ success: true, ref: makeRef() });
            }
            if (t.merge && existing && !sub.danger) {
                await databases.updateDocument(DB, ALERTS, existing.$id, {
                    message: cut(`${existing.message || ''} | ${sub.message}`, 1000),
                    notes: appendNote(existing.notes, { at: nowIso(), by: 'système', text: `Nouveau message du même numéro (${sub.channel}) : ${cut(sub.message, 300) || '(sans texte)'}` }),
                    updatedAt: nowIso(),
                });
                return res.json({ success: true, ref: existing.ref, merged: true, reply: `Message reçu, réf ${existing.ref}.` });
            }

            const ref = makeRef();
            const doc = await databases.createDocument(DB, ALERTS, ID.unique(), {
                ref, status: 'nouvelle', priority: t.priority, danger: sub.danger, forWho: sub.forWho, channel: sub.channel,
                posterCode: sub.posterCode, place: sub.place, geo: sub.geo, phone: sub.phone, phoneKey: key, callOk: sub.callOk,
                bestTime: sub.bestTime, message: sub.message, flags: t.flags.join(','), notes: '[]', assignedTo: '', firstActionAt: '',
                deviceHash: hash, createdAt: nowIso(), updatedAt: nowIso(),
            });
            if (t.priority !== 'basse') await notifyResponders({ ref, priority: t.priority });
            log(`🆘 HALTE ${ref} (${t.priority}, ${sub.channel}${t.flags.length ? `, ${t.flags.join('/')}` : ''})`);
            return res.json({
                success: true, ref,
                reply: `Message reçu, réf ${ref}. Une personne va te contacter. En danger ? Appelle le 138 ou le 117.`,
            });
        }

        // ---------- Espace cellule d'écoute ----------
        if (!callerId) return res.json({ success: false, error: 'Authentification requise.' }, 401);
        const caller = await databases.getDocument(DB, USERS, callerId).catch(() => null);
        if (!caller || caller.isBanned) return res.json({ success: false, error: 'Accès refusé.' }, 403);
        const isResponder = caller.isResponder === true;
        const isMod = caller.isModerator === true;

        if (action === 'stats') {
            if (!isResponder && !isMod) return res.json({ success: false, error: 'Accès refusé.' }, 403);
            const r = await databases.listDocuments(DB, ALERTS, [
                Query.orderDesc('createdAt'), Query.limit(500),
                Query.select(['status', 'priority', 'channel', 'posterCode', 'createdAt', 'firstActionAt']),
            ]);
            return res.json({ success: true, ...buildStats(r.documents), truncated: r.total > 500 });
        }

        if (!isResponder) return res.json({ success: false, error: "Réservé à la cellule d'écoute." }, 403);

        if (action === 'list') {
            const queries = [Query.orderDesc('createdAt'), Query.limit(50), Query.offset(Math.max(0, Number(body.offset) || 0))];
            queries.unshift(Query.equal('status', STATUSES.includes(body.status) ? [body.status] : OPEN_STATUSES));
            const r = await databases.listDocuments(DB, ALERTS, queries);
            const rank = { urgent: 0, normale: 1, basse: 2 };
            const alerts = r.documents
                .map((d) => ({
                    id: d.$id, ref: d.ref, status: d.status, priority: d.priority, danger: !!d.danger, channel: d.channel,
                    place: d.place, hasPhone: !!d.phone, flags: d.flags ? d.flags.split(',') : [], assignedTo: d.assignedTo || '',
                    posterCode: d.posterCode || '', createdAt: d.createdAt,
                }))
                .sort((a, b) => (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1) || String(b.createdAt).localeCompare(String(a.createdAt)));
            return res.json({ success: true, total: r.total, alerts });
        }

        if (action === 'get' || action === 'update') {
            const id = String(body.id || '');
            const d = await databases.getDocument(DB, ALERTS, id).catch(() => null);
            if (!d) return res.json({ success: false, error: 'Alerte introuvable.' });
            const patch = {};
            let notes = d.notes;
            const who = caller.name || callerId;

            if (action === 'get') {
                // Trace des consultations (qui a lu quoi), sans répéter la même ligne en boucle.
                let last;
                try { last = JSON.parse(d.notes || '[]').slice(-1)[0]; } catch { last = null; }
                const recent = last && last.action === 'consultation' && last.byId === callerId && Date.now() - Date.parse(last.at) < 600000;
                if (!recent) {
                    await databases.updateDocument(DB, ALERTS, id, { notes: appendNote(d.notes, { at: nowIso(), by: who, byId: callerId, action: 'consultation' }) }).catch(() => {});
                }
            } else {
                if (body.status !== undefined) {
                    if (!STATUSES.includes(body.status)) return res.json({ success: false, error: 'Statut inconnu.' });
                    patch.status = body.status;
                    notes = appendNote(notes, { at: nowIso(), by: who, byId: callerId, action: 'statut', text: body.status });
                }
                if (body.assignToMe === true) {
                    patch.assignedTo = callerId;
                    if (!body.status && d.status === 'nouvelle') patch.status = 'en_cours';
                    notes = appendNote(notes, { at: nowIso(), by: who, byId: callerId, action: 'prise en charge' });
                }
                if (body.note) notes = appendNote(notes, { at: nowIso(), by: who, byId: callerId, action: 'note', text: cut(body.note, 600) });
                if (!d.firstActionAt) patch.firstActionAt = nowIso();
                patch.notes = notes;
                patch.updatedAt = nowIso();
                await databases.updateDocument(DB, ALERTS, id, patch);
            }
            const fresh = action === 'update' ? { ...d, ...patch } : d;
            let timeline = [];
            try { timeline = JSON.parse(fresh.notes || '[]'); } catch { timeline = []; }
            return res.json({
                success: true,
                alert: {
                    id: fresh.$id, ref: fresh.ref, status: fresh.status, priority: fresh.priority, danger: !!fresh.danger,
                    forWho: fresh.forWho, channel: fresh.channel, posterCode: fresh.posterCode || '', place: fresh.place, geo: fresh.geo,
                    phone: fresh.phone, callOk: !!fresh.callOk, bestTime: fresh.bestTime, message: fresh.message,
                    flags: fresh.flags ? fresh.flags.split(',') : [], assignedTo: fresh.assignedTo || '', createdAt: fresh.createdAt,
                    updatedAt: fresh.updatedAt, timeline,
                },
            });
        }

        return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
    } catch (err) {
        error(`halte-alert : ${err?.message || err}`);
        return res.json({ success: false, error: 'Un problème technique est survenu. Si tu es en danger, appelle le 138 ou le 117.' }, 500);
    }
};

// functions/send-newsletter/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   functions.createExecution('send-newsletter', JSON.stringify({ subject, htmlBody }))
//
// SÉCURITÉ : réservé aux modérateurs (vérifié via x-appwrite-user-id).
// Envoie par lots de 100 (limite batch Resend) à tous les utilisateurs qui
// n'ont pas désactivé la newsletter, avec un lien de désabonnement propre
// à chacun.
import { Client, Databases, Users, Query } from 'node-appwrite';
import { Resend } from 'resend';
import crypto from 'crypto';

export default async ({ req, res, log, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) {
        return res.json({ success: false, error: 'Authentification requise.' }, 401);
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const users = new Users(client); // Source fiable des emails (Appwrite Auth),
                                       // utilisée en repli quand le document
                                       // `users` (base de données) n'a pas
                                       // d'email synchronisé.
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL; // ex: "Ça Parle <news@news.kinemaplus.com>"
    const APP_URL = process.env.APP_URL; // ex: "https://kinemaplus.com"
    const UNSUB_SECRET = process.env.UNSUB_SECRET; // chaîne secrète, générée une fois

    // Récupère l'email d'un utilisateur, avec repli sur Appwrite Auth si le
    // document `users` n'a pas ce champ rempli (comptes anciens/mal
    // synchronisés).
    async function resolveEmail(userId, dbEmail) {
        if (dbEmail) return dbEmail;
        try {
            const authUser = await users.get(userId);
            return authUser.email || null;
        } catch {
            return null;
        }
    }

    // Version texte brut à partir du HTML — un email sans alternative texte
    // (HTML only) est lui-même un signal négatif pour beaucoup de filtres
    // anti-spam.
    function stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    try {
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { subject, htmlBody, testOnly } = body;
        if (!subject || !htmlBody) {
            return res.json({ success: false, error: 'subject et htmlBody requis.' }, 400);
        }

        const resend = new Resend(RESEND_API_KEY);

        // Génère un lien de désabonnement signé pour chaque destinataire
        // (protège contre le désabonnement forcé d'un tiers au hasard).
        function unsubscribeLink(userId) {
            const token = crypto.createHmac('sha256', UNSUB_SECRET).update(userId).digest('hex');
            return `${APP_URL}/unsubscribe?userId=${userId}&token=${token}`;
        }

        // Mode test : envoie UNIQUEMENT à l'appelant lui-même, quel que soit
        // le nombre réel d'utilisateurs. Permet de vérifier le rendu et le
        // lien de désabonnement sans jamais risquer un envoi accidentel à
        // toute la liste pendant qu'on teste.
        if (testOnly) {
            const callerEmail = await resolveEmail(callerId, callerUser.email);
            if (!callerEmail) {
                return res.json({ success: false, error: "Impossible de trouver un email pour ton compte, même via Appwrite Auth." }, 400);
            }
            const link = unsubscribeLink(callerId);
            await resend.emails.send({
                from: FROM_EMAIL,
                to: callerEmail,
                subject: `[TEST] ${subject}`,
                html: `${htmlBody}
                    <hr style="margin-top:32px;border:none;border-top:1px solid #eee;">
                    <p style="font-size:12px;color:#999;">
                        Ceci est un email de test — seul toi le reçois.
                        <a href="${link}">Se désabonner</a>
                    </p>`,
                text: `${stripHtml(htmlBody)}\n\nSe désabonner : ${link}`,
                headers: {
                    'List-Unsubscribe': `<${link}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            });
            return res.json({ success: true, sent: 1, failed: 0, total: 1, testOnly: true });
        }

        // Récupère tous les utilisateurs non désabonnés (pagination).
        const recipients = [];
        let offset = 0;
        const pageSize = 100;
        let hasMore = true;
        while (hasMore) {
            const result = await databases.listDocuments(DATABASE_ID, COLLECTION_USERS, [
                Query.notEqual('newsletterOptOut', true),
                Query.limit(pageSize),
                Query.offset(offset),
            ]);
            recipients.push(...result.documents);
            offset += pageSize;
            hasMore = result.documents.length === pageSize;
        }

        // Résout l'email de chaque destinataire, avec repli Auth pour ceux
        // dont le document `users` n'a pas ce champ.
        const resolved = await Promise.all(
            recipients.map(async (u) => ({ id: u.$id, email: await resolveEmail(u.$id, u.email) }))
        );
        const missingEmailCount = resolved.filter((r) => !r.email).length;
        if (missingEmailCount > 0) {
            log(`${missingEmailCount} utilisateur(s) sans email trouvable (ni base, ni Auth) — exclus de l'envoi.`);
        }

        // Resend accepte jusqu'à 100 emails par appel batch.
        const BATCH_SIZE = 100;
        let sent = 0;
        let failed = 0;
        const validRecipients = resolved.filter((r) => !!r.email);

        for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
            const batch = validRecipients.slice(i, i + BATCH_SIZE);
            const emails = batch.map((r) => {
                const link = unsubscribeLink(r.id);
                return {
                    from: FROM_EMAIL,
                    to: r.email,
                    subject,
                    html: `${htmlBody}
                        <hr style="margin-top:32px;border:none;border-top:1px solid #eee;">
                        <p style="font-size:12px;color:#999;">
                            Tu reçois cet email car tu es inscrit(e) sur Ça Parle.
                            <a href="${link}">Se désabonner</a>
                        </p>`,
                    text: `${stripHtml(htmlBody)}\n\nSe désabonner : ${link}`,
                    headers: {
                        'List-Unsubscribe': `<${link}>`,
                        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                    },
                };
            });

            try {
                await resend.batch.send(emails);
                sent += emails.length;
            } catch (batchErr) {
                log(`Échec batch ${i}-${i + BATCH_SIZE}: ${batchErr.message}`);
                failed += emails.length;
            }
        }

        return res.json({ success: true, sent, failed, total: recipients.length, missingEmail: missingEmailCount });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
// functions/send-newsletter/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   functions.createExecution('send-newsletter', JSON.stringify({ subject, htmlBody }))
//
// SÉCURITÉ : réservé aux modérateurs (vérifié via x-appwrite-user-id).
// Envoie par lots de 100 (limite batch Resend) à tous les utilisateurs qui
// n'ont pas désactivé la newsletter, avec un lien de désabonnement propre
// à chacun.
import { Client, Databases, Query } from 'node-appwrite';
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
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL; // ex: "Ça Parle <news@news.kinemaplus.com>"
    const APP_URL = process.env.APP_URL; // ex: "https://kinemaplus.com"
    const UNSUB_SECRET = process.env.UNSUB_SECRET; // chaîne secrète, générée une fois

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
            if (!callerUser.email) {
                return res.json({ success: false, error: "Ton profil n'a pas d'email enregistré." }, 400);
            }
            await resend.emails.send({
                from: FROM_EMAIL,
                to: callerUser.email,
                subject: `[TEST] ${subject}`,
                html: `${htmlBody}
                    <hr style="margin-top:32px;border:none;border-top:1px solid #eee;">
                    <p style="font-size:12px;color:#999;">
                        Ceci est un email de test — seul toi le reçois.
                        <a href="${unsubscribeLink(callerId)}">Se désabonner</a>
                    </p>`,
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

        // Resend accepte jusqu'à 100 emails par appel batch.
        const BATCH_SIZE = 100;
        let sent = 0;
        let failed = 0;

        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            const emails = batch
                .filter((u) => !!u.email)
                .map((u) => ({
                    from: FROM_EMAIL,
                    to: u.email,
                    subject,
                    html: `${htmlBody}
                        <hr style="margin-top:32px;border:none;border-top:1px solid #eee;">
                        <p style="font-size:12px;color:#999;">
                            Tu reçois cet email car tu es inscrit(e) sur Ça Parle.
                            <a href="${unsubscribeLink(u.$id)}">Se désabonner</a>
                        </p>`,
                }));

            try {
                await resend.batch.send(emails);
                sent += emails.length;
            } catch (batchErr) {
                log(`Échec batch ${i}-${i + BATCH_SIZE}: ${batchErr.message}`);
                failed += emails.length;
            }
        }

        return res.json({ success: true, sent, failed, total: recipients.length });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
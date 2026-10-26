// functions/manage-profile/src/main.js — Vanessa
// Photo de profil et compte certifié. Appel depuis l'application :
//   { action: 'set_avatar', fileId }        — l'utilisateur vient d'envoyer sa photo dans le bucket des avatars
//   { action: 'remove_avatar' }
//   Modérateurs uniquement :
//   { action: 'set_certified', userId, certified: true|false }
//   { action: 'list_certified' }
// Le nom et l'e-mail ne sont volontairement modifiables ici par personne.
import { Client, Databases, Storage, Query } from 'node-appwrite';
import { checkAvatarFile, avatarViewUrl, fileIdFromUrl } from './logic.js';

export default async ({ req, res, log, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) return res.json({ success: false, error: 'Authentification requise.' }, 401);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    const storage = new Storage(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const USERS = process.env.COLLECTION_USERS;
    const BUCKET = process.env.BUCKET_AVATARS;
    // Adresse que les navigateurs peuvent joindre (sinon celle de la Function).
    const PUBLIC_ENDPOINT = process.env.PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const PROJECT = process.env.APPWRITE_FUNCTION_PROJECT_ID;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action } = body;
        const caller = await databases.getDocument(DATABASE_ID, USERS, callerId);
        if (caller.isBanned) return res.json({ success: false, error: 'Compte suspendu.' }, 403);

        if (action === 'set_avatar') {
            const fileId = String(body.fileId || '');
            if (!fileId || !BUCKET) return res.json({ success: false, error: 'Envoi de photo non configuré.' });
            const file = await storage.getFile(BUCKET, fileId).catch(() => null);
            const problem = checkAvatarFile(file, callerId);
            if (problem) {
                if (file && problem !== "Ce fichier n'est pas à toi.") await storage.deleteFile(BUCKET, fileId).catch(() => {});
                return res.json({ success: false, error: problem });
            }
            const previous = fileIdFromUrl(caller.avatarUrl, BUCKET);
            const avatarUrl = avatarViewUrl(PUBLIC_ENDPOINT, BUCKET, fileId, PROJECT);
            await databases.updateDocument(DATABASE_ID, USERS, callerId, { avatarUrl });
            if (previous && previous !== fileId) await storage.deleteFile(BUCKET, previous).catch(() => {});
            return res.json({ success: true, avatarUrl });
        }

        if (action === 'remove_avatar') {
            const previous = fileIdFromUrl(caller.avatarUrl, BUCKET);
            await databases.updateDocument(DATABASE_ID, USERS, callerId, { avatarUrl: '' });
            if (previous) await storage.deleteFile(BUCKET, previous).catch(() => {});
            return res.json({ success: true, avatarUrl: '' });
        }

        // — Réservé aux modérateurs —
        if (!caller.isModerator) return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);

        if (action === 'set_certified') {
            const userId = String(body.userId || '');
            if (!userId) return res.json({ success: false, error: 'Utilisateur manquant.' });
            const certified = body.certified === true;
            try {
                await databases.updateDocument(DATABASE_ID, USERS, userId, { isCertified: certified });
            } catch (e) {
                const msg = String(e.message || '');
                if (/attribute|unknown/i.test(msg)) {
                    return res.json({ success: false, error: "L'attribut « isCertified » n'existe pas encore dans la collection users." });
                }
                return res.json({ success: false, error: 'Profil introuvable.' });
            }
            log(`🔵 ${callerId} a ${certified ? 'certifié' : 'retiré la certification de'} ${userId}`);
            return res.json({ success: true, userId, isCertified: certified });
        }

        if (action === 'list_certified') {
            const r = await databases.listDocuments(DATABASE_ID, USERS, [Query.equal('isCertified', true), Query.limit(100)]);
            return res.json({
                success: true,
                users: r.documents.map((d) => ({ id: d.$id, name: d.name || '', avatarUrl: d.avatarUrl || '' })),
            });
        }

        return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

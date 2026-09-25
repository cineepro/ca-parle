// functions/moderate-content/src/main.js — Vanessa
// Appel HTTP explicite depuis le client :
//   functions.createExecution('moderate-content', JSON.stringify({ action, targetId, reportId }))
//   action ∈ 'hide_story' | 'delete_story' | 'hide_comment' | 'delete_comment' | 'ban_author' | 'reject_report'
//
// SÉCURITÉ : c'est la Function la plus sensible du projet. Elle vérifie
// systématiquement isModerator === true sur le document `users` de
// l'appelant (x-appwrite-user-id, infalsifiable) avant toute action.
// Aucune autre porte d'entrée ne doit permettre ces actions — voir la
// recommandation de verrouillage des permissions dans le README.
import { Client, Databases } from 'node-appwrite';

const VALID_ACTIONS = ['hide_story', 'delete_story', 'hide_comment', 'delete_comment', 'ban_author', 'reject_report'];

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
    const COLLECTION_STORIES = process.env.COLLECTION_STORIES;
    const COLLECTION_COMMENTS = process.env.COLLECTION_COMMENTS;
    const COLLECTION_REPORTS = process.env.COLLECTION_REPORTS;

    try {
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action, targetId, reportId } = body;

        if (!VALID_ACTIONS.includes(action)) {
            return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
        }

        switch (action) {
            case 'hide_story':
                await databases.updateDocument(DATABASE_ID, COLLECTION_STORIES, targetId, { moderationStatus: 'masque' });
                break;
            case 'delete_story':
                await databases.updateDocument(DATABASE_ID, COLLECTION_STORIES, targetId, { moderationStatus: 'supprime' });
                break;
            case 'hide_comment':
                await databases.updateDocument(DATABASE_ID, COLLECTION_COMMENTS, targetId, { moderationStatus: 'masque' });
                break;
            case 'delete_comment':
                await databases.updateDocument(DATABASE_ID, COLLECTION_COMMENTS, targetId, { moderationStatus: 'supprime' });
                break;
            case 'ban_author': {
                // targetId ici est directement l'userId à bannir (résolu
                // côté client à partir de story.authorId ou comment.authorId).
                await databases.updateDocument(DATABASE_ID, COLLECTION_USERS, targetId, { isBanned: true });
                break;
            }
            case 'reject_report':
                // Rien à faire sur le contenu, seulement sur le signalement.
                break;
        }

        if (reportId) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_REPORTS, reportId, {
                status: action === 'reject_report' ? 'rejete' : 'traite',
            });
        }

        return res.json({ success: true, action });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

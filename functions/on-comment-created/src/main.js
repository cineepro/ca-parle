// functions/on-comment-created/src/main.js — Ça Parle
// Déclencheur : databases.*.collections.<COMMENTS>.documents.*.create
//
// Fait tout ce que useComments.ts faisait côté client (de façon
// falsifiable) : incrémente stories.commentsCount, met à jour la
// réputation/badges de l'auteur du commentaire, et notifie l'auteur de
// l'histoire (nouveau commentaire) ou l'auteur du commentaire parent
// (réponse).
import { Client, Databases, Query, ID } from 'node-appwrite';

const GOSSIP_LEVEL_THRESHOLDS = [0, 50, 150, 300, 600, 1000, 2000];

function computeGossipLevel(reputationScore) {
    let level = 1;
    for (const threshold of GOSSIP_LEVEL_THRESHOLDS) {
        if (reputationScore >= threshold) level++;
        else break;
    }
    return Math.min(level, GOSSIP_LEVEL_THRESHOLDS.length);
}

function meetsCriteria(key, stats) {
    switch (key) {
        case 'lanceur_affaire': return stats.storiesCount >= 1;
        case 'roi_du_ragot': return stats.storiesCount >= 20;
        case 'detective': return stats.revelationsCount >= 5;
        case 'commentateur': return stats.commentsCount >= 10;
        case 'toujours_au_courant': return stats.commentsCount >= 50;
        case 'source_fiable': return stats.reliabilityIndex >= 80 && stats.predictionsTotal >= 5;
        default: return false;
    }
}

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const COLLECTION_STORIES = process.env.COLLECTION_STORIES;
    const COLLECTION_COMMENTS = process.env.COLLECTION_COMMENTS;
    const COLLECTION_BADGES = process.env.COLLECTION_BADGES;
    const COLLECTION_USER_BADGES = process.env.COLLECTION_USER_BADGES;
    const COLLECTION_NOTIFICATIONS = process.env.COLLECTION_NOTIFICATIONS;

    try {
        const comment = req.bodyJson ?? JSON.parse(req.body || '{}');
        const authorId = comment.authorId;
        const storyId = comment.storyId;

        // 1. Compteur dénormalisé sur la story.
        const story = await databases.getDocument(DATABASE_ID, COLLECTION_STORIES, storyId);
        await databases.updateDocument(DATABASE_ID, COLLECTION_STORIES, storyId, {
            commentsCount: (story.commentsCount || 0) + 1,
        });

        // 2. Réputation de l'auteur du commentaire.
        let stats = null;
        if (authorId) {
            const user = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, authorId);
            const storiesCount = user.storiesCount || 0;
            const revelationsCount = (user.revelationsCount || 0) + (comment.type === 'revelation' ? 1 : 0);
            const commentsCount = (user.commentsCount || 0) + 1;
            const predictionsCorrect = user.predictionsCorrect || 0;
            const predictionsTotal = user.predictionsTotal || 0;
            const reliabilityIndex = predictionsTotal > 0
                ? Math.round((predictionsCorrect / predictionsTotal) * 100)
                : (user.reliabilityIndex ?? 50);
            const reputationScore = storiesCount * 10 + revelationsCount * 15 + commentsCount * 2 + predictionsCorrect * 5;
            const gossipLevel = computeGossipLevel(reputationScore);

            await databases.updateDocument(DATABASE_ID, COLLECTION_USERS, authorId, {
                revelationsCount, commentsCount, reliabilityIndex, reputationScore, gossipLevel,
            });

            stats = { storiesCount, revelationsCount, commentsCount, predictionsCorrect, predictionsTotal, reliabilityIndex };

            // Badges.
            const catalog = await databases.listDocuments(DATABASE_ID, COLLECTION_BADGES, [Query.limit(100)]);
            const earned = await databases.listDocuments(DATABASE_ID, COLLECTION_USER_BADGES, [
                Query.equal('userId', authorId), Query.limit(100),
            ]);
            const earnedIds = new Set(earned.documents.map((d) => d.badgeId));

            for (const badge of catalog.documents) {
                if (earnedIds.has(badge.$id)) continue;
                if (meetsCriteria(badge.key, stats)) {
                    await databases.createDocument(DATABASE_ID, COLLECTION_USER_BADGES, ID.unique(), {
                        userId: authorId, badgeId: badge.$id, earnedAt: new Date().toISOString(),
                    });
                    await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                        userId: authorId,
                        title: `${badge.icon} Nouveau badge !`,
                        message: `Tu as obtenu le badge "${badge.name}".`,
                        url: '/profil',
                        read: false,
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        }

        // 3. Notification : réponse à un commentaire OU commentaire sur
        // l'histoire (jamais les deux, pour ne pas doubler la notif reçue
        // par l'auteur de l'histoire quand un fil de discussion se répond
        // à lui-même).
        if (comment.parentCommentId) {
            const parent = await databases.getDocument(DATABASE_ID, COLLECTION_COMMENTS, comment.parentCommentId);
            if (parent.authorId && parent.authorId !== authorId) {
                await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                    userId: parent.authorId,
                    title: '💬 Nouvelle réponse',
                    message: 'Quelqu\'un a répondu à ton commentaire.',
                    url: `/histoire/${storyId}`,
                    read: false,
                    createdAt: new Date().toISOString(),
                });
            }
        } else if (story.authorId && story.authorId !== authorId) {
            await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                userId: story.authorId,
                title: '💬 Nouveau commentaire',
                message: `Quelqu'un a commenté « ${story.title} ».`,
                url: `/histoire/${storyId}`,
                read: false,
                createdAt: new Date().toISOString(),
            });
        }

        return res.json({ success: true });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

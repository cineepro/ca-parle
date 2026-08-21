// functions/on-story-created/src/main.js — Ça Parle
// Déclencheur : databases.*.collections.<STORIES>.documents.*.create
//
// Recalcule storiesCount / revelationsCount / reputationScore / gossipLevel
// / reliabilityIndex sur le profil de l'auteur, puis attribue les badges
// nouvellement mérités. C'est la version serveur (fiable, infalsifiable)
// de ce que reputationService.recompute() + badgeService.checkAndAward()
// faisaient côté client.
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

// Doit rester identique à src/features/reputation/badgeCatalog.ts côté client.
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
    const COLLECTION_BADGES = process.env.COLLECTION_BADGES;
    const COLLECTION_USER_BADGES = process.env.COLLECTION_USER_BADGES;
    const COLLECTION_NOTIFICATIONS = process.env.COLLECTION_NOTIFICATIONS;

    try {
        const story = req.bodyJson ?? JSON.parse(req.body || '{}');
        const userId = story.authorId;
        if (!userId) return res.json({ skipped: true, reason: 'authorId manquant' });

        const user = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, userId);

        const storiesCount = (user.storiesCount || 0) + 1;
        const revelationsCount = (user.revelationsCount || 0) + (story.type === 'revelation' ? 1 : 0);
        const commentsCount = user.commentsCount || 0;
        const predictionsCorrect = user.predictionsCorrect || 0;
        const predictionsTotal = user.predictionsTotal || 0;
        const reliabilityIndex = predictionsTotal > 0
            ? Math.round((predictionsCorrect / predictionsTotal) * 100)
            : (user.reliabilityIndex ?? 50);
        const reputationScore = storiesCount * 10 + revelationsCount * 15 + commentsCount * 2 + predictionsCorrect * 5;
        const gossipLevel = computeGossipLevel(reputationScore);

        await databases.updateDocument(DATABASE_ID, COLLECTION_USERS, userId, {
            storiesCount, revelationsCount, reliabilityIndex, reputationScore, gossipLevel,
        });

        // Attribution des badges nouvellement mérités.
        const stats = { storiesCount, revelationsCount, commentsCount, predictionsCorrect, predictionsTotal, reliabilityIndex };
        const catalog = await databases.listDocuments(DATABASE_ID, COLLECTION_BADGES, [Query.limit(100)]);
        const earned = await databases.listDocuments(DATABASE_ID, COLLECTION_USER_BADGES, [
            Query.equal('userId', userId), Query.limit(100),
        ]);
        const earnedIds = new Set(earned.documents.map((d) => d.badgeId));

        for (const badge of catalog.documents) {
            if (earnedIds.has(badge.$id)) continue;
            if (meetsCriteria(badge.key, stats)) {
                await databases.createDocument(DATABASE_ID, COLLECTION_USER_BADGES, ID.unique(), {
                    userId, badgeId: badge.$id, earnedAt: new Date().toISOString(),
                });
                await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                    userId,
                    title: `${badge.icon} Nouveau badge !`,
                    message: `Tu as obtenu le badge "${badge.name}".`,
                    url: '/profil',
                    read: false,
                    createdAt: new Date().toISOString(),
                });
            }
        }

        return res.json({ success: true, storiesCount, reputationScore, gossipLevel });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
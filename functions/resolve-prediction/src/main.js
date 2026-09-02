// functions/resolve-prediction/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   functions.createExecution('resolve-prediction', JSON.stringify({ predictionId, correctOptionIndex }))
//
// SÉCURITÉ : vérifie que l'utilisateur appelant est bien l'auteur de
// l'histoire concernée avant de résoudre la prédiction. x-appwrite-user-id
// est injecté automatiquement par Appwrite quand la Function est exécutée
// avec la session de l'utilisateur connecté (permission d'exécution
// "users" côté function) — impossible à falsifier depuis le client.
import { Client, Databases, Query, ID } from 'node-appwrite';

const GOSSIP_LEVEL_THRESHOLDS = [0, 50, 150, 300, 600, 1000, 2000];
function computeGossipLevel(score) {
    let level = 1;
    for (const t of GOSSIP_LEVEL_THRESHOLDS) { if (score >= t) level++; else break; }
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
    const COLLECTION_PREDICTIONS = process.env.COLLECTION_PREDICTIONS;
    const COLLECTION_PREDICTION_VOTES = process.env.COLLECTION_PREDICTION_VOTES;
    const COLLECTION_BADGES = process.env.COLLECTION_BADGES;
    const COLLECTION_USER_BADGES = process.env.COLLECTION_USER_BADGES;
    const COLLECTION_NOTIFICATIONS = process.env.COLLECTION_NOTIFICATIONS;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { predictionId, correctOptionIndex } = body;
        if (!predictionId || correctOptionIndex === undefined) {
            return res.json({ success: false, error: 'predictionId et correctOptionIndex requis.' }, 400);
        }

        const prediction = await databases.getDocument(DATABASE_ID, COLLECTION_PREDICTIONS, predictionId);
        if (prediction.status === 'resolue') {
            return res.json({ success: false, error: 'Cette prédiction est déjà résolue.' }, 409);
        }

        const story = await databases.getDocument(DATABASE_ID, COLLECTION_STORIES, prediction.storyId);
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);

        // Autorisation : auteur de l'histoire OU modérateur.
        if (story.authorId !== callerId && !callerUser.isModerator) {
            return res.json({ success: false, error: "Seul l'auteur de l'histoire ou un modérateur peut résoudre cette prédiction." }, 403);
        }

        await databases.updateDocument(DATABASE_ID, COLLECTION_PREDICTIONS, predictionId, {
            status: 'resolue',
            correctOptionIndex,
        });

        // Récupère tous les votes (pagination).
        const votes = [];
        let offset = 0;
        const pageSize = 100;
        let hasMore = true;
        while (hasMore) {
            const result = await databases.listDocuments(DATABASE_ID, COLLECTION_PREDICTION_VOTES, [
                Query.equal('predictionId', predictionId),
                Query.limit(pageSize),
                Query.offset(offset),
            ]);
            votes.push(...result.documents);
            offset += pageSize;
            hasMore = result.documents.length === pageSize;
        }

        const catalog = await databases.listDocuments(DATABASE_ID, COLLECTION_BADGES, [Query.limit(100)]);

        for (const vote of votes) {
            try {
                const user = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, vote.userId);
                const wasCorrect = vote.optionIndex === correctOptionIndex;
                const predictionsTotal = (user.predictionsTotal || 0) + 1;
                const predictionsCorrect = (user.predictionsCorrect || 0) + (wasCorrect ? 1 : 0);
                const reliabilityIndex = Math.round((predictionsCorrect / predictionsTotal) * 100);
                const storiesCount = user.storiesCount || 0;
                const revelationsCount = user.revelationsCount || 0;
                const commentsCount = user.commentsCount || 0;
                const reputationScore = storiesCount * 10 + revelationsCount * 15 + commentsCount * 2 + predictionsCorrect * 5;
                const gossipLevel = computeGossipLevel(reputationScore);

                await databases.updateDocument(DATABASE_ID, COLLECTION_USERS, vote.userId, {
                    predictionsTotal, predictionsCorrect, reliabilityIndex, reputationScore, gossipLevel,
                });

                await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                    userId: vote.userId,
                    title: wasCorrect ? '🔮 Bonne prédiction !' : '🔮 Prédiction résolue',
                    message: wasCorrect
                        ? 'Tu avais vu juste ! Ta fiabilité vient de grimper.'
                        : "Ta prédiction ne s'est pas réalisée cette fois.",
                    url: `/histoire/${prediction.storyId}`,
                    read: false,
                    createdAt: new Date().toISOString(),
                });

                // Badges (source_fiable notamment).
                const stats = { storiesCount, revelationsCount, commentsCount, predictionsCorrect, predictionsTotal, reliabilityIndex };
                const earned = await databases.listDocuments(DATABASE_ID, COLLECTION_USER_BADGES, [
                    Query.equal('userId', vote.userId), Query.limit(100),
                ]);
                const earnedIds = new Set(earned.documents.map((d) => d.badgeId));
                for (const badge of catalog.documents) {
                    if (earnedIds.has(badge.$id)) continue;
                    if (meetsCriteria(badge.key, stats)) {
                        await databases.createDocument(DATABASE_ID, COLLECTION_USER_BADGES, ID.unique(), {
                            userId: vote.userId, badgeId: badge.$id, earnedAt: new Date().toISOString(),
                        });
                        await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                            userId: vote.userId,
                            title: `${badge.icon} Nouveau badge !`,
                            message: `Tu as obtenu le badge "${badge.name}".`,
                            url: '/profil',
                            read: false,
                            createdAt: new Date().toISOString(),
                        });
                    }
                }
            } catch (voteErr) {
                log(`Échec traitement vote ${vote.$id}: ${voteErr.message}`);
            }
        }

        return res.json({ success: true, votesProcessed: votes.length });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

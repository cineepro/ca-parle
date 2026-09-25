// functions/on-reaction-write/src/main.js — Vanessa
// Déclencheurs :
//   databases.*.collections.<REACTIONS>.documents.*.create
//   databases.*.collections.<REACTIONS>.documents.*.update
//   databases.*.collections.<REACTIONS>.documents.*.delete
//
// Recompte le total de réactions pour la cible concernée et le persiste
// sur stories.reactionsCount. Ne gère que targetType === 'story' — les
// commentaires n'ont pas de compteur de réactions dans le schéma actuel.
import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_STORIES = process.env.COLLECTION_STORIES;
    const COLLECTION_REACTIONS = process.env.COLLECTION_REACTIONS;

    try {
        const reaction = req.bodyJson ?? JSON.parse(req.body || '{}');
        if (reaction.targetType !== 'story') {
            return res.json({ skipped: true, reason: 'targetType non géré' });
        }

        const storyId = reaction.targetId;

        let total = 0;
        let offset = 0;
        const pageSize = 100;
        let hasMore = true;
        while (hasMore) {
            const result = await databases.listDocuments(DATABASE_ID, COLLECTION_REACTIONS, [
                Query.equal('targetType', 'story'),
                Query.equal('targetId', storyId),
                Query.limit(pageSize),
                Query.offset(offset),
            ]);
            total += result.documents.length;
            offset += pageSize;
            hasMore = result.documents.length === pageSize;
        }

        await databases.updateDocument(DATABASE_ID, COLLECTION_STORIES, storyId, {
            reactionsCount: total,
        });

        return res.json({ success: true, reactionsCount: total });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

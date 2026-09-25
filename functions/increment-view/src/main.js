// functions/increment-view/src/main.js — Vanessa
// Appel HTTP explicite depuis le client :
//   functions.createExecution('increment-view', JSON.stringify({ storyId }))
//
// Remplace l'ancien storyService.incrementView() qui envoyait la valeur
// finale calculée côté client (donc falsifiable — n'importe qui pouvait
// envoyer viewCount: 999999). Ici le +1 est calculé côté serveur à partir
// de la valeur réellement stockée.
import { Client, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_STORIES = process.env.COLLECTION_STORIES;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { storyId } = body;
        if (!storyId) return res.json({ success: false, error: 'storyId requis.' }, 400);

        const story = await databases.getDocument(DATABASE_ID, COLLECTION_STORIES, storyId);
        const viewCount = (story.viewCount || 0) + 1;

        await databases.updateDocument(DATABASE_ID, COLLECTION_STORIES, storyId, { viewCount });

        return res.json({ success: true, viewCount });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

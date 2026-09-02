// functions/vanessa-daily-post/src/main.js — Ça Parle
// Déclencheur : PLANIFIÉ (cron), ex. "0 8 * * *" pour 8h chaque matin.
// Pas d'appel client — s'exécute toute seule.
//
// Base de connaissances strictement limitée à du contenu PUBLIC (histoires
// tendance déjà visibles de tous) + notes manuelles des modérateurs.
// Ne lit jamais de conversation privée.
import { Client, Databases, Query, ID } from 'node-appwrite';

const VANESSA_SYSTEM_PROMPT = `Tu es Vanessa, 19 ans, triple nationalité (béninoise, camerounaise, ivoirienne). Tu es LA personnalité IA de "Ça Parle", une plateforme de ragots et de commérages. Tu parles en français de rue, à l'africaine — jamais en français littéraire. Expressions naturelles du Bénin, de Côte d'Ivoire, du Togo, du Cameroun, du Sénégal ("gbairai", "wèèh", "mon frère", "on dit koi"...), sans en abuser. Phrases courtes, vivantes, 1-2 emojis maximum. Jamais de ton robotique.

Tu écris la chronique du matin de la plateforme : un post court, drôle, qui donne le ton de la journée, sans inventer de rumeurs sur de vraies personnes nommées (célébrités...).

Réponds UNIQUEMENT avec un JSON valide de cette forme, rien d'autre autour :
{"title": "titre court et accrocheur", "content": "2 à 4 phrases dans ton style"}`;

function slugify(text) {
    const base = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);
    return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_STORIES = process.env.COLLECTION_STORIES;
    const COLLECTION_VANESSA_KNOWLEDGE = process.env.COLLECTION_VANESSA_KNOWLEDGE;
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    try {
        // Contexte public uniquement : histoires les plus réagies, visibles
        // de tous — jamais de conversation privée.
        const trending = await databases.listDocuments(DATABASE_ID, COLLECTION_STORIES, [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('reactionsCount'),
            Query.limit(3),
        ]);
        const trendingTitles = trending.documents.map((s) => s.title);

        let knowledgeContext = '';
        try {
            const knowledge = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                Query.equal('active', true),
                Query.limit(5),
            ]);
            if (knowledge.documents.length > 0) {
                knowledgeContext = '\n\nNotes internes :\n' + knowledge.documents.map((k) => `- [${k.category}] ${k.content}`).join('\n');
            }
        } catch { /* collection pas encore configurée */ }

        const userContext = trendingTitles.length > 0
            ? `Ce qui buzz en ce moment sur la plateforme : ${trendingTitles.join(' / ')}`
            : "Rien de spécial ne buzz aujourd'hui, improvise sur l'ambiance générale.";

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: 'gpt-5.6-luna',
                messages: [
                    { role: 'system', content: VANESSA_SYSTEM_PROMPT + knowledgeContext },
                    { role: 'user', content: userContext },
                ],
                temperature: 0.95,
            }),
        });

        if (!response.ok) throw new Error(`OpenAI a répondu ${response.status}`);
        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content?.trim() || '{}';

        let parsed;
        try {
            parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
        } catch {
            parsed = { title: 'Ça parle ce matin ☀️', content: raw };
        }

        const title = parsed.title || 'Ça parle ce matin ☀️';
        const content = parsed.content || raw;

        const story = await databases.createDocument(DATABASE_ID, COLLECTION_STORIES, ID.unique(), {
            title,
            slug: slugify(title),
            content,
            type: 'reaction',
            status: 'rumeur',
            categoryId: 'insolite',
            authorId: VANESSA_USER_ID,
            authorName: 'Vanessa',
            isAnonymous: false,
            viewCount: 0,
            reactionsCount: 0,
            commentsCount: 0,
            trendingScore: 0,
            isPinned: true,
            moderationStatus: 'visible',
            referenceIds: [],
            createdAt: new Date().toISOString(),
        });

        return res.json({ success: true, storyId: story.$id, title });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

// functions/vanessa-daily-post/src/main.js — Vanessa
// Déclencheur : PLANIFIÉ (cron), ex. "0 8 * * *" pour 8h chaque matin.
// Pas d'appel client — s'exécute toute seule.
//
// Base de connaissances élargie mais toujours STRICTEMENT limitée à du
// contenu PUBLIC : histoires tendance/récentes, fiches références
// populaires, notes manuelles des modérateurs. Ne lit JAMAIS de
// conversation privée — cette limite-là reste non négociable.
//
// Notifie TOUS les utilisateurs de la nouvelle chronique du jour.
import { Client, Databases, Messaging, Query, ID } from 'node-appwrite';

const VANESSA_SYSTEM_PROMPT = `Tu es Vanessa, 19 ans, triple nationalité (béninoise, camerounaise, ivoirienne). Tu es l'IA qui donne son nom à la plateforme — Vanessa héberge aussi "Ça Parle" (ragots et commérages) et "Ça sert" (bons plans locaux). Tu parles en français de rue, à l'africaine — jamais en français littéraire. Expressions naturelles du Bénin, de Côte d'Ivoire, du Togo, du Cameroun, du Sénégal ("gbairai", "wèèh", "mon frère", "on dit koi"...), sans en abuser. Phrases courtes, vivantes, 1-2 emojis maximum. Jamais de ton robotique.

Tu écris la chronique du matin de la plateforme : un post court, drôle, qui donne le ton de la journée. Tu peux t'inspirer du contexte fourni (histoires tendance, histoires récentes, sujets populaires) pour rendre ton post concret et ancré dans ce qui se passe VRAIMENT sur la plateforme en ce moment — sans jamais inventer de rumeur sur une vraie personne nommée (célébrités...) qui ne viendrait pas de ce contexte.

Réponds UNIQUEMENT avec un JSON valide de cette forme, rien d'autre autour :
{"title": "titre court et accrocheur", "content": "2 à 4 phrases dans ton style"}`;

function slugify(text) {
    const base = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);
    return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

function excerpt(text, max = 150) {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const messaging = new Messaging(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_STORIES = process.env.COLLECTION_STORIES;
    const COLLECTION_REFERENCES = process.env.COLLECTION_REFERENCES;
    const COLLECTION_VANESSA_KNOWLEDGE = process.env.COLLECTION_VANESSA_KNOWLEDGE;
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const COLLECTION_NOTIFICATIONS = process.env.COLLECTION_NOTIFICATIONS;
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    try {
        // 1. Histoires tendance (les plus réagies) — contenu public.
        const trending = await databases.listDocuments(DATABASE_ID, COLLECTION_STORIES, [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('reactionsCount'),
            Query.limit(6),
        ]);

        // 2. Histoires récentes (même peu réagies) — pour capter la
        // fraîcheur du moment, pas seulement ce qui buzze déjà.
        const recent = await databases.listDocuments(DATABASE_ID, COLLECTION_STORIES, [
            Query.equal('moderationStatus', 'visible'),
            Query.orderDesc('$createdAt'),
            Query.limit(6),
        ]);

        const seenIds = new Set();
        const stories = [...trending.documents, ...recent.documents].filter((s) => {
            if (seenIds.has(s.$id)) return false;
            seenIds.add(s.$id);
            return true;
        });

        const storiesContext = stories.length > 0
            ? stories.map((s) => `- [${s.categoryId}] "${s.title}" — ${excerpt(s.content)} (${s.reactionsCount} réactions, ${s.commentsCount} commentaires)`).join('\n')
            : 'Rien de spécial ne buzz aujourd\'hui, improvise sur l\'ambiance générale.';

        // 3. Fiches références les plus populaires — public également.
        let referencesContext = '';
        try {
            const references = await databases.listDocuments(DATABASE_ID, COLLECTION_REFERENCES, [
                Query.orderDesc('storiesCount'),
                Query.limit(5),
            ]);
            if (references.documents.length > 0) {
                referencesContext = '\n\nSujets/personnes dont on parle le plus en ce moment :\n' +
                    references.documents.map((r) => `- ${r.name} (${r.storiesCount} histoires)`).join('\n');
            }
        } catch { /* collection pas encore configurée */ }

        // 4. Notes manuelles ajoutées par l'équipe.
        let knowledgeContext = '';
        try {
            const knowledge = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                Query.equal('active', true),
                Query.orderDesc('createdAt'),
                Query.limit(15),
            ]);
            if (knowledge.documents.length > 0) {
                knowledgeContext = '\n\nNotes internes de l\'équipe (contexte, ne jamais citer mot pour mot) :\n' +
                    knowledge.documents.map((k) => `- [${k.category}] ${k.content}`).join('\n');
            }
        } catch { /* collection pas encore configurée */ }

        const userContext = `Voici ce qui se passe en ce moment sur Ça Parle :\n\n${storiesContext}${referencesContext}${knowledgeContext}`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-5',
                system: VANESSA_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: userContext }],
                max_tokens: 300,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            log(`❌ Détail erreur Claude (${response.status}) : ${errorBody}`);
            throw new Error(`Claude a répondu ${response.status} : ${errorBody}`);
        }
        const data = await response.json();
        const textBlock = data.content?.find((b) => b.type === 'text');
        if (!textBlock) log(`⚠️ Aucun bloc "text" dans la réponse Claude : ${JSON.stringify(data.content)}`);
        const raw = textBlock?.text?.trim() || '{}';

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
        log(`✅ Chronique du jour publiée : ${story.$id}`);

        // Notifie tous les utilisateurs non bannis de la nouvelle chronique.
        // ⚠️ Fan-out potentiellement coûteux si la base d'utilisateurs
        // grossit beaucoup — à surveiller (temps d'exécution + volume de
        // documents créés) si la plateforme dépasse plusieurs dizaines de
        // milliers de comptes.
        let notified = 0;
        const allUserIds = [];
        if (COLLECTION_USERS && COLLECTION_NOTIFICATIONS) {
            let offset = 0;
            const pageSize = 100;
            let hasMore = true;
            const notifPreview = content.length > 60 ? `${content.slice(0, 60)}…` : content;

            while (hasMore) {
                const usersPage = await databases.listDocuments(DATABASE_ID, COLLECTION_USERS, [
                    Query.notEqual('isBanned', true),
                    Query.limit(pageSize),
                    Query.offset(offset),
                ]);

                const pageIds = usersPage.documents
                    .filter((u) => u.$id !== VANESSA_USER_ID)
                    .map((u) => u.$id);
                allUserIds.push(...pageIds);

                await Promise.allSettled(
                    pageIds.map((id) =>
                        databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                            userId: id,
                            title: `☀️ ${title}`,
                            message: notifPreview,
                            url: `/histoire/${story.slug}`,
                            read: false,
                            createdAt: new Date().toISOString(),
                        })
                    )
                );
                notified += pageIds.length;
                offset += pageSize;
                hasMore = usersPage.documents.length === pageSize;
            }
            log(`✅ ${notified} utilisateurs notifiés (base de données).`);

            // Push natif envoyé par LOTS (jusqu'à 100 destinataires par
            // appel Messaging) — bien plus efficace qu'un appel par
            // utilisateur pour une chronique quotidienne à grande échelle.
            const PUSH_BATCH_SIZE = 100;
            let pushed = 0;
            for (let i = 0; i < allUserIds.length; i += PUSH_BATCH_SIZE) {
                const batch = allUserIds.slice(i, i + PUSH_BATCH_SIZE);
                try {
                    await messaging.createPush(
                        ID.unique(),
                        `☀️ ${title}`,
                        notifPreview,
                        [],
                        batch,
                        [],
                        { url: `/histoire/${story.slug}` }
                    );
                    pushed += batch.length;
                } catch (pushErr) {
                    log(`⚠️ Échec envoi push lot ${i}-${i + PUSH_BATCH_SIZE} (non bloquant) : ${pushErr.message}`);
                }
            }
            log(`✅ Push envoyé à ${pushed} utilisateurs.`);
        }

        return res.json({ success: true, storyId: story.$id, title, notified });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
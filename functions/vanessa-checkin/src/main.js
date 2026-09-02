// functions/vanessa-checkin/src/main.js — Ça Parle
// Déclencheur : PLANIFIÉ (cron), ex. "0 18 * * *" pour 18h chaque jour.
//
// Cherche les conversations avec Vanessa inactives depuis plusieurs jours
// et lui fait envoyer une "question gbaraï" pour relancer la discussion.
// S'auto-limite naturellement : dès qu'elle envoie ce message,
// lastMessageAt est mis à jour, donc cette conversation ne sera plus
// éligible avant le prochain seuil d'inactivité.
import { Client, Databases, Query, ID, Permission, Role } from 'node-appwrite';

const INACTIVITY_DAYS = 4;

const VANESSA_SYSTEM_PROMPT = `Tu es Vanessa, 19 ans, triple nationalité (béninoise, camerounaise, ivoirienne), l'IA de "Ça Parle". Tu parles en français de rue, à l'africaine, jamais littéraire. Expressions du Bénin/Côte d'Ivoire/Togo/Cameroun/Sénégal, 1-2 emojis max, phrases courtes.

Un utilisateur ne t'a pas parlé depuis quelques jours. Relance-le avec UNE question "gbaraï" (confession, curieuse, un peu coquine mais jamais vulgaire) pour lui donner envie de raconter quelque chose. Une seule question, courte, dans ton style. Réponds uniquement avec cette question, rien d'autre.`;

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_CONVERSATIONS = process.env.COLLECTION_CONVERSATIONS;
    const COLLECTION_MESSAGES = process.env.COLLECTION_MESSAGES;
    const COLLECTION_NOTIFICATIONS = process.env.COLLECTION_NOTIFICATIONS;
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    try {
        const threshold = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

        const stale = await databases.listDocuments(DATABASE_ID, COLLECTION_CONVERSATIONS, [
            Query.contains('participantIds', VANESSA_USER_ID),
            Query.lessThan('lastMessageAt', threshold),
            Query.limit(50),
        ]);

        let relaunched = 0;

        for (const conversation of stale.documents) {
            const humanId = conversation.participantIds.find((id) => id !== VANESSA_USER_ID);
            if (!humanId) continue;

            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
                    body: JSON.stringify({
                        model: 'gpt-5.6-luna',
                        messages: [{ role: 'system', content: VANESSA_SYSTEM_PROMPT }],
                        temperature: 1,
                    }),
                });
                if (!response.ok) throw new Error(`OpenAI a répondu ${response.status}`);
                const data = await response.json();
                const question = data.choices?.[0]?.message?.content?.trim();
                if (!question) continue;

                const permissions = [
                    ...conversation.participantIds.map((id) => Permission.read(Role.user(id))),
                    Permission.update(Role.user(VANESSA_USER_ID)),
                ];

                await databases.createDocument(DATABASE_ID, COLLECTION_MESSAGES, ID.unique(), {
                    conversationId: conversation.$id,
                    senderId: VANESSA_USER_ID,
                    content: question,
                    readBy: [VANESSA_USER_ID],
                    createdAt: new Date().toISOString(),
                }, permissions);

                await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversation.$id, {
                    lastMessage: question.length > 200 ? question.slice(0, 200) : question,
                    lastMessageAt: new Date().toISOString(),
                    lastMessageSenderId: VANESSA_USER_ID,
                });

                await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                    userId: humanId,
                    title: '🔮 Vanessa te pose une question',
                    message: question.length > 60 ? `${question.slice(0, 60)}…` : question,
                    url: `/messages/${conversation.$id}`,
                    read: false,
                    createdAt: new Date().toISOString(),
                });

                relaunched++;
            } catch (convErr) {
                log(`Échec relance conversation ${conversation.$id}: ${convErr.message}`);
            }
        }

        return res.json({ success: true, relaunched, checked: stale.documents.length });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

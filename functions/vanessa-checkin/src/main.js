// functions/vanessa-checkin/src/main.js — Ça Parle
// Déclencheur : PLANIFIÉ (cron), ex. "0 18 * * *" pour 18h chaque jour.
//
// Cherche les conversations avec Vanessa inactives depuis plusieurs jours
// et lui fait envoyer une "question gbaraï" pour relancer la discussion.
//
// ⚠️ Anti-harcèlement : ne relance QUE si le DERNIER message de la
// conversation vient de l'humain (pas de Vanessa). Après une relance,
// lastMessageSenderId devient Vanessa — donc cette conversation ne sera
// plus jamais re-proposée tant que la personne n'a pas répondu elle-même,
// même si des semaines passent. Une seule relance par silence, jamais un
// harcèlement de rappels successifs.
import { Client, Databases, Messaging, Query, ID, Permission, Role } from 'node-appwrite';

const INACTIVITY_DAYS = 4;

const VANESSA_SYSTEM_PROMPT = `Tu es Vanessa, 19 ans, triple nationalité (béninoise, camerounaise, ivoirienne), l'IA de "Ça Parle". Tu parles en français de rue, à l'africaine, jamais littéraire. Expressions du Bénin/Côte d'Ivoire/Togo/Cameroun/Sénégal, 1-2 emojis max, phrases courtes.

Un utilisateur ne t'a pas parlé depuis quelques jours. Relance-le avec UNE question "gbaraï" (confession, curieuse, un peu coquine mais jamais vulgaire) pour lui donner envie de raconter quelque chose. Une seule question, courte, dans ton style. Réponds uniquement avec cette question, rien d'autre.`;

async function sendPush(messaging, userId, title, body, url, log) {
    try {
        await messaging.createPush(ID.unique(), title, body, [], [userId], [], url ? { url } : undefined);
    } catch (err) {
        log(`⚠️ Push notification échouée (non bloquant) : ${err.message}`);
    }
}

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const messaging = new Messaging(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_CONVERSATIONS = process.env.COLLECTION_CONVERSATIONS;
    const COLLECTION_MESSAGES = process.env.COLLECTION_MESSAGES;
    const COLLECTION_NOTIFICATIONS = process.env.COLLECTION_NOTIFICATIONS;
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    try {
        const threshold = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

        const stale = await databases.listDocuments(DATABASE_ID, COLLECTION_CONVERSATIONS, [
            Query.contains('participantIds', VANESSA_USER_ID),
            Query.lessThan('lastMessageAt', threshold),
            Query.notEqual('lastMessageSenderId', VANESSA_USER_ID),
            Query.limit(50),
        ]);

        let relaunched = 0;

        for (const conversation of stale.documents) {
            const humanId = conversation.participantIds.find((id) => id !== VANESSA_USER_ID);
            if (!humanId) continue;

            try {
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
                        messages: [{ role: 'user', content: 'Relance-moi avec ta question gbaraï.' }],
                        max_tokens: 150,
                    }),
                });
                if (!response.ok) {
                    const errorBody = await response.text();
                    log(`❌ Détail erreur Claude (${response.status}) : ${errorBody}`);
                    throw new Error(`Claude a répondu ${response.status} : ${errorBody}`);
                }
                const data = await response.json();
                const question = data.content?.[0]?.text?.trim();
                if (!question) continue;

                const permissions = [
                    ...conversation.participantIds.map((id) => Permission.read(Role.user(id))),
                    Permission.update(Role.user(VANESSA_USER_ID)),
                ];

                await databases.createDocument(DATABASE_ID, COLLECTION_MESSAGES, ID.unique(), {
                    conversationId: conversation.$id,
                    senderId: VANESSA_USER_ID,
                    content: question,
                    type: 'text',
                    audioFileId: '',
                    audioDuration: 0,
                    imageFileId: '',
                    readBy: [VANESSA_USER_ID],
                    createdAt: new Date().toISOString(),
                }, permissions);

                await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversation.$id, {
                    lastMessage: question.length > 200 ? question.slice(0, 200) : question,
                    lastMessageAt: new Date().toISOString(),
                    lastMessageSenderId: VANESSA_USER_ID,
                });

                // Ici, la notification reste volontaire : contrairement à
                // une réponse en pleine conversation active, une relance
                // arrive alors que l'utilisateur n'est probablement pas
                // dans l'app — c'est justement le but.
                await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                    userId: humanId,
                    title: '🔮 Vanessa te pose une question',
                    message: question.length > 60 ? `${question.slice(0, 60)}…` : question,
                    url: `/messages/${conversation.$id}`,
                    read: false,
                    createdAt: new Date().toISOString(),
                });

                await sendPush(
                    messaging, humanId, '🔮 Vanessa te pose une question',
                    question.length > 60 ? `${question.slice(0, 60)}…` : question,
                    `/messages/${conversation.$id}`, log
                );

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
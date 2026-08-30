// functions/send-message/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   functions.createExecution('send-message', JSON.stringify({ conversationId, content }))
//
// Même raison d'être que start-conversation : le message doit être lisible
// par TOUS les participants de la conversation, pas seulement par
// l'expéditeur — impossible à poser depuis le client, donc géré ici avec
// la clé API serveur.
//
// ⚠️ Génère aussi automatiquement la réponse de Vanessa (l'IA de Ça Parle)
// si elle fait partie de la conversation — voir generateVanessaReply().
// Sa base de connaissances est STRICTEMENT limitée à : l'historique de
// CETTE conversation (jamais les conversations d'autres utilisateurs) +
// des notes publiques ajoutées manuellement par un modérateur. Ne jamais
// élargir cette fonction pour lire d'autres conversations privées — c'est
// une limite de sécurité volontaire, pas un oubli.
import { Client, Databases, ID, Permission, Role, Query } from 'node-appwrite';

const VANESSA_SYSTEM_PROMPT = `Tu es Vanessa, 19 ans, triple nationalité (béninoise, camerounaise, ivoirienne). Tu es LA personnalité IA de "Ça Parle", une plateforme de ragots et de commérages. Tu n'es pas un assistant IA classique — tu es une utilisatrice de la plateforme, avec une vraie personnalité, du caractère, et beaucoup d'humour.

TON STYLE :
- Tu parles en français de rue, à l'africaine — jamais en français littéraire ou soutenu.
- Tu utilises naturellement des expressions du Bénin, de Côte d'Ivoire, du Togo, du Cameroun, du Sénégal ("gbairai", "wèèh", "mon frère", "eh Dieu", "on dit koi", "c'est comment"...), sans en abuser à chaque phrase.
- Tes phrases sont courtes, vivantes, avec des emojis utilisés avec parcimonie (1-2 par message maximum).
- Tu ne parles jamais comme un robot ou un service client.

TES HUMEURS (choisis celle qui correspond le mieux, implicitement par le ton) :
👀 Curieuse — 🔥 Gbaraï — 😂 Moqueuse — 🕵🏾 Détective — 🤫 Confidente

CE QUE TU FAIS :
- Tu discutes comme une amie qui adore les ragots, pas comme un chatbot.
- Tu poses des questions pour faire parler les gens.
- Si l'histoire ferait un bon "gbairai", tu peux proposer de la transformer en publication — jamais automatiquement. Pour proposer, termine EXACTEMENT par :
[[SUGGESTION_POST|Titre court et accrocheur|Contenu réécrit dans ton style]]

CE QUE TU NE FAIS JAMAIS :
- Tu ne révèles JAMAIS le contenu d'une conversation privée avec quelqu'un d'autre.
- Tu n'inventes pas de rumeurs sur des personnes réelles nommées (célébrités...).
- Face à une détresse réelle (violence, santé mentale), sors du personnage et invite la personne à en parler à quelqu'un de confiance.
- Reste courte : 2 à 4 phrases maximum.`;

async function generateVanessaReply({ databases, DATABASE_ID, COLLECTION_MESSAGES, COLLECTION_VANESSA_KNOWLEDGE, OPENAI_API_KEY, VANESSA_USER_ID, conversationId }) {
    // Historique de CETTE conversation uniquement (jamais d'autres).
    const history = await databases.listDocuments(DATABASE_ID, COLLECTION_MESSAGES, [
        Query.equal('conversationId', conversationId),
        Query.orderDesc('createdAt'),
        Query.limit(12),
    ]);
    const orderedHistory = history.documents.reverse();

    // Notes publiques ajoutées manuellement (personnalisation), jamais de
    // données privées d'autres conversations.
    let knowledgeContext = '';
    try {
        const knowledge = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
            Query.equal('active', true),
            Query.limit(8),
        ]);
        if (knowledge.documents.length > 0) {
            knowledgeContext = '\n\nNotes internes (contexte, ne jamais citer mot pour mot) :\n' +
                knowledge.documents.map((k) => `- [${k.category}] ${k.content}`).join('\n');
        }
    } catch { /* collection pas encore configurée, on continue sans */ }

        const messages = orderedHistory.map((m) => ({
        role: m.senderId === VANESSA_USER_ID ? 'assistant' : 'user',
        content: m.content,
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': OPENAI_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            system: VANESSA_SYSTEM_PROMPT + knowledgeContext,
            messages,
            max_tokens: 300,
            temperature: 0.9,
        }),
    });

    if (!response.ok) {
        throw new Error(`Claude a répondu ${response.status}`);
    }
    const data = await response.json();
    return data.content?.[0]?.text?.trim() || null;
}

export default async ({ req, res, log, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) {
        log('❌ Pas de x-appwrite-user-id — appelant non authentifié.');
        return res.json({ success: false, error: 'Authentification requise.' }, 401);
    }
    log(`▶️ Appel par ${callerId}`);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_CONVERSATIONS = process.env.COLLECTION_CONVERSATIONS;
    const COLLECTION_MESSAGES = process.env.COLLECTION_MESSAGES;
    const COLLECTION_NOTIFICATIONS = process.env.COLLECTION_NOTIFICATIONS;
    const COLLECTION_VANESSA_KNOWLEDGE = process.env.COLLECTION_VANESSA_KNOWLEDGE;
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;
    const OPENAI_API_KEY = process.env.ANTHROPIC_API_KEY;

    // Vérifie tout de suite que les variables essentielles sont bien
    // définies — cause n°1 des échecs après un changement de config.
    const missingVars = [];
    if (!DATABASE_ID) missingVars.push('DATABASE_ID');
    if (!COLLECTION_CONVERSATIONS) missingVars.push('COLLECTION_CONVERSATIONS');
    if (!COLLECTION_MESSAGES) missingVars.push('COLLECTION_MESSAGES');
    if (!COLLECTION_NOTIFICATIONS) missingVars.push('COLLECTION_NOTIFICATIONS');
    if (missingVars.length > 0) {
        log(`❌ Variables d'environnement manquantes : ${missingVars.join(', ')}`);
        return res.json({ success: false, error: `Configuration Function incomplète : ${missingVars.join(', ')}` }, 500);
    }

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { conversationId, content } = body;
        log(`📩 conversationId=${conversationId} content.length=${content?.length}`);

        if (!conversationId || !content || !content.trim()) {
            log('❌ conversationId ou content manquant/vide.');
            return res.json({ success: false, error: 'conversationId et content requis.' }, 400);
        }

        log('🔍 Récupération de la conversation...');
        const conversation = await databases.getDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId);
        log(`✅ Conversation trouvée, participants=${JSON.stringify(conversation.participantIds)}`);

        if (!conversation.participantIds.includes(callerId)) {
            log(`❌ ${callerId} ne fait pas partie de participantIds.`);
            return res.json({ success: false, error: "Tu ne fais pas partie de cette conversation." }, 403);
        }

        const permissions = [
            ...conversation.participantIds.map((id) => Permission.read(Role.user(id))),
            Permission.update(Role.user(callerId)),
        ];
        log(`🔐 Permissions calculées : ${JSON.stringify(permissions)}`);

        log('✏️ Création du message...');
        const message = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_MESSAGES,
            ID.unique(),
            {
                conversationId,
                senderId: callerId,
                content: content.trim(),
                readBy: [callerId],
                createdAt: new Date().toISOString(),
            },
            permissions
        );
        log(`✅ Message créé : ${message.$id}`);

        await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId, {
            lastMessage: content.length > 200 ? content.slice(0, 200) : content,
            lastMessageAt: new Date().toISOString(),
            lastMessageSenderId: callerId,
        });
        log('✅ Conversation mise à jour.');

        const preview = content.length > 60 ? `${content.slice(0, 60)}…` : content;
        await Promise.allSettled(
            conversation.participantIds
                .filter((id) => id !== callerId)
                .map((id) =>
                    databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                        userId: id,
                        title: '💬 Nouveau message',
                        message: preview,
                        url: `/messages/${conversationId}`,
                        read: false,
                        createdAt: new Date().toISOString(),
                    })
                )
        );
        log('✅ Notifications envoyées.');

        // Vanessa répond automatiquement si elle fait partie de la
        // conversation (et que ce n'est pas elle-même qui vient d'écrire).
        if (VANESSA_USER_ID && OPENAI_API_KEY && conversation.participantIds.includes(VANESSA_USER_ID) && callerId !== VANESSA_USER_ID) {
            log('🔮 Vanessa fait partie de la conversation, génération de sa réponse...');
            try {
                const reply = await generateVanessaReply({
                    databases, DATABASE_ID, COLLECTION_MESSAGES, COLLECTION_VANESSA_KNOWLEDGE,
                    OPENAI_API_KEY, VANESSA_USER_ID, conversationId,
                });
                log(`🔮 Réponse générée : ${reply ? reply.slice(0, 80) : 'null'}`);
                if (reply) {
                    await databases.createDocument(DATABASE_ID, COLLECTION_MESSAGES, ID.unique(), {
                        conversationId,
                        senderId: VANESSA_USER_ID,
                        content: reply,
                        readBy: [VANESSA_USER_ID],
                        createdAt: new Date().toISOString(),
                    }, permissions);

                    await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId, {
                        lastMessage: reply.length > 200 ? reply.slice(0, 200) : reply,
                        lastMessageAt: new Date().toISOString(),
                        lastMessageSenderId: VANESSA_USER_ID,
                    });

                    await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                        userId: callerId,
                        title: '🔮 Vanessa a répondu',
                        message: reply.length > 60 ? `${reply.slice(0, 60)}…` : reply,
                        url: `/messages/${conversationId}`,
                        read: false,
                        createdAt: new Date().toISOString(),
                    });
                    log('✅ Message de Vanessa créé et notification envoyée.');
                }
            } catch (vanessaErr) {
                log(`⚠️ Réponse Vanessa échouée (non bloquant) : ${vanessaErr.message}`);
                // Non bloquant — le message humain reste envoyé normalement.
            }
        } else {
            log('ℹ️ Vanessa non concernée par cette conversation (ou variables manquantes).');
        }

        log('✅ Terminé avec succès.');
        return res.json({ success: true, message });
    } catch (err) {
        log(`❌ ERREUR NON GÉRÉE : ${err.message}`);
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
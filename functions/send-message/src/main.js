// functions/send-message/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   functions.createExecution('send-message', JSON.stringify({ conversationId, content }))
//
// Même raison d'être que start-conversation : le message doit être lisible
// par TOUS les participants de la conversation, pas seulement par
// l'expéditeur — impossible à poser depuis le client, donc géré ici avec
// la clé API serveur.
import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

export default async ({ req, res, error }) => {
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
    const COLLECTION_CONVERSATIONS = process.env.COLLECTION_CONVERSATIONS;
    const COLLECTION_MESSAGES = process.env.COLLECTION_MESSAGES;
    const COLLECTION_NOTIFICATIONS = process.env.COLLECTION_NOTIFICATIONS;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { conversationId, content } = body;

        if (!conversationId || !content || !content.trim()) {
            return res.json({ success: false, error: 'conversationId et content requis.' }, 400);
        }

        const conversation = await databases.getDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId);

        // Autorisation : l'appelant doit être un participant de cette
        // conversation — sinon n'importe qui pourrait écrire dans la
        // conversation de n'importe qui en devinant/trouvant son ID.
        if (!conversation.participantIds.includes(callerId)) {
            return res.json({ success: false, error: "Tu ne fais pas partie de cette conversation." }, 403);
        }

        const permissions = [
            ...conversation.participantIds.map((id) => Permission.read(Role.user(id))),
            Permission.update(Role.user(callerId)),
        ];

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

        await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId, {
            lastMessage: content.length > 200 ? content.slice(0, 200) : content,
            lastMessageAt: new Date().toISOString(),
            lastMessageSenderId: callerId,
        });

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

        return res.json({ success: true, message });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
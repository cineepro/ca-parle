// functions/manage-emissions/src/main.js — Vanessa
// Réservé aux modérateurs.
//   { action: 'create', title, guestName, topic, posture }
//   { action: 'list' }
//   { action: 'update_status', emissionId, status }  // 'préparé' | 'enregistré' | 'publié'
//
// Une "émission" est une conversation avec Vanessa un peu spéciale : le
// sujet et la posture demandée sont directement écrits sur le document
// `conversations` (emissionTopic/emissionPosture) — c'est ce que
// send-message lit pour basculer en mode libre (voir generateVanessaReply).
// La fiche `emissions`, elle, ne sert qu'au classement/suivi côté équipe
// (titre, invité, statut) — elle ne contient jamais les messages eux-mêmes.
import { Client, Databases, Query, ID, Permission, Role } from 'node-appwrite';

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
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const COLLECTION_CONVERSATIONS = process.env.COLLECTION_CONVERSATIONS;
    const COLLECTION_EMISSIONS = process.env.COLLECTION_EMISSIONS;
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;

    try {
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action } = body;

        switch (action) {
            case 'create': {
                const { title, guestName, topic, posture } = body;
                if (!title || !topic) {
                    return res.json({ success: false, error: 'title et topic requis.' }, 400);
                }

                // Une conversation neuve, dédiée à cet épisode — jamais
                // partagée avec une autre, pour que le sujet/la posture de
                // l'une n'influencent jamais une autre émission par erreur.
                const permissions = [callerId, VANESSA_USER_ID].flatMap((id) => [
                    Permission.read(Role.user(id)),
                    Permission.update(Role.user(id)),
                ]);
                const conversation = await databases.createDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, ID.unique(), {
                    participantIds: [callerId, VANESSA_USER_ID],
                    isGroup: false,
                    directKey: `emission__${ID.unique()}`,
                    title: `🎙️ ${title}`,
                    emissionTopic: topic.trim(),
                    emissionPosture: (posture || '').trim(),
                    lastMessage: '',
                    lastMessageAt: new Date().toISOString(),
                    lastMessageSenderId: '',
                    createdAt: new Date().toISOString(),
                }, permissions);

                const emission = await databases.createDocument(DATABASE_ID, COLLECTION_EMISSIONS, ID.unique(), {
                    title: title.trim(),
                    guestName: (guestName || '').trim(),
                    topic: topic.trim(),
                    posture: (posture || '').trim(),
                    status: 'préparé',
                    conversationId: conversation.$id,
                    createdBy: callerId,
                    createdAt: new Date().toISOString(),
                });

                return res.json({ success: true, emission, conversation });
            }

            case 'list': {
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_EMISSIONS, [
                    Query.orderDesc('createdAt'),
                    Query.limit(50),
                ]);
                return res.json({ success: true, emissions: result.documents });
            }

            case 'update_status': {
                const { emissionId, status } = body;
                if (!emissionId || !status) {
                    return res.json({ success: false, error: 'emissionId et status requis.' }, 400);
                }
                const updated = await databases.updateDocument(DATABASE_ID, COLLECTION_EMISSIONS, emissionId, { status });
                return res.json({ success: true, emission: updated });
            }

            default:
                return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
        }
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
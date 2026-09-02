// functions/start-conversation/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   functions.createExecution('start-conversation', JSON.stringify({ otherUserId }))
//
// POURQUOI CETTE FUNCTION EXISTE : Appwrite interdit à un client d'accorder
// une permission (ex: Read) à un autre utilisateur que lui-même — seule une
// clé API serveur en a le droit. Comme une conversation à deux doit être
// lisible par les DEUX participants, cette opération ne peut techniquement
// pas se faire depuis le navigateur, quelle que soit la légitimité de la
// demande. D'où cette Function, qui pose les permissions au nom des deux
// utilisateurs avec la clé API serveur.
import { Client, Databases, Query, ID, Permission, Role } from 'node-appwrite';

function buildDirectKey(userIdA, userIdB) {
    return [userIdA, userIdB].sort().join('_');
}

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

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { otherUserId } = body;

        if (!otherUserId) {
            return res.json({ success: false, error: 'otherUserId requis.' }, 400);
        }
        if (otherUserId === callerId) {
            return res.json({ success: false, error: "Impossible de démarrer une conversation avec toi-même." }, 400);
        }

        const directKey = buildDirectKey(callerId, otherUserId);

        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_CONVERSATIONS, [
            Query.equal('directKey', directKey),
            Query.limit(1),
        ]);
        if (existing.documents.length > 0) {
            return res.json({ success: true, conversation: existing.documents[0] });
        }

        const permissions = [callerId, otherUserId].flatMap((id) => [
            Permission.read(Role.user(id)),
            Permission.update(Role.user(id)),
        ]);

        const conversation = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_CONVERSATIONS,
            ID.unique(),
            {
                participantIds: [callerId, otherUserId],
                isGroup: false,
                directKey,
                lastMessage: '',
                lastMessageAt: new Date().toISOString(),
                lastMessageSenderId: '',
                createdAt: new Date().toISOString(),
            },
            permissions
        );

        return res.json({ success: true, conversation });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};

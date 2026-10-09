// functions/manage-notes/src/main.js — Vanessa
// Cahier de notes personnel. Chaque utilisateur ne voit et ne modifie QUE ses propres notes.
//   { action: 'list' }
//   { action: 'create', title?, content }
//   { action: 'update', id, title?, content? }
//   { action: 'delete', id }
//
// Passe par une Function (clé serveur) plutôt que par le SDK du navigateur : l'identité
// vient de l'en-tête x-appwrite-user-id (non falsifiable), et les permissions de chaque
// note sont posées ici, sans dépendre d'un réglage de collection côté Appwrite.
import { Client, Databases, Query, ID, Permission, Role } from 'node-appwrite';

const MAX_TITLE_CHARS = 120;
const MAX_CONTENT_CHARS = 5000;
const MAX_NOTES_PER_USER = 300;

const clean = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);

const toPublic = (d) => ({
    $id: d.$id, title: d.title || '', content: d.content || '',
    createdAt: d.createdAt || d.$createdAt, updatedAt: d.updatedAt || d.$updatedAt,
});

export default async ({ req, res, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) return res.json({ success: false, error: 'Authentification requise.' }, 401);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_USER_NOTES = process.env.COLLECTION_USER_NOTES;

    if (!COLLECTION_USER_NOTES) {
        return res.json({ success: false, error: 'COLLECTION_USER_NOTES non configurée.' });
    }

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action, id } = body;

        // Une note n'est accessible que par son propriétaire — vérifié à chaque lecture/écriture.
        const getOwned = async () => {
            if (!id) return null;
            try {
                const doc = await databases.getDocument(DATABASE_ID, COLLECTION_USER_NOTES, id);
                return doc.userId === callerId ? doc : null;
            } catch {
                return null;
            }
        };

        switch (action) {
            case 'list': {
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_USER_NOTES, [
                    Query.equal('userId', callerId),
                    Query.limit(MAX_NOTES_PER_USER),
                ]);
                // Tri ici plutôt que dans la requête : aucun index supplémentaire à créer.
                const notes = result.documents
                    .map(toPublic)
                    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
                return res.json({ success: true, notes });
            }

            case 'create': {
                const content = clean(body.content, MAX_CONTENT_CHARS);
                const title = clean(body.title, MAX_TITLE_CHARS);
                if (!content && !title) return res.json({ success: false, error: 'La note est vide.' });

                const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_USER_NOTES, [
                    Query.equal('userId', callerId), Query.limit(1),
                ]);
                if (existing.total >= MAX_NOTES_PER_USER) {
                    return res.json({ success: false, error: `Tu as atteint la limite de ${MAX_NOTES_PER_USER} notes. Supprime-en pour en ajouter.` });
                }

                const now = new Date().toISOString();
                const doc = await databases.createDocument(DATABASE_ID, COLLECTION_USER_NOTES, ID.unique(), {
                    userId: callerId, title, content, createdAt: now, updatedAt: now,
                }, [
                    Permission.read(Role.user(callerId)),
                    Permission.update(Role.user(callerId)),
                    Permission.delete(Role.user(callerId)),
                ]);
                return res.json({ success: true, note: toPublic(doc) });
            }

            case 'update': {
                const note = await getOwned();
                if (!note) return res.json({ success: false, error: 'Note introuvable.' });
                const patch = { updatedAt: new Date().toISOString() };
                if (body.title !== undefined) patch.title = clean(body.title, MAX_TITLE_CHARS);
                if (body.content !== undefined) patch.content = clean(body.content, MAX_CONTENT_CHARS);
                if (!(patch.title ?? note.title) && !(patch.content ?? note.content)) {
                    return res.json({ success: false, error: 'La note ne peut pas être entièrement vide — supprime-la plutôt.' });
                }
                const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_USER_NOTES, id, patch);
                return res.json({ success: true, note: toPublic(doc) });
            }

            case 'delete': {
                const note = await getOwned();
                if (!note) return res.json({ success: false, error: 'Note introuvable.' });
                await databases.deleteDocument(DATABASE_ID, COLLECTION_USER_NOTES, id);
                return res.json({ success: true });
            }

            default:
                return res.json({ success: false, error: `Action inconnue : ${action}` });
        }
    } catch (err) {
        error(err.message);
        // 200 volontaire : un statut non-2xx masque le message côté Appwrite.
        return res.json({ success: false, error: err.message });
    }
};

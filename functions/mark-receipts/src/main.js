// functions/mark-receipts/src/main.js — Vanessa
// Accusés de réception d'une conversation entre deux personnes.
//   { conversationId | conversationIds[], kind: 'delivered' | 'read' }
//
// Fonctionne par "repères" (watermarks) plutôt que par message : pour
// chaque participant, la conversation retient deux dates — `d` (dernier
// moment où son appareil a reçu des messages) et `r` (dernier moment où il
// les a lus). Un message envoyé AVANT `d` est "reçu", avant `r` est "lu".
// Une seule écriture par accusé, quel que soit le nombre de messages —
// bien moins coûteux que de modifier chaque message un par un.
//
// SÉCURITÉ : chacun ne peut modifier QUE son propre repère (la clé de
// l'appelant), après vérification qu'il fait bien partie de la conversation
// — jamais celui de l'autre participant. Les messages eux-mêmes ne sont
// jamais touchés (le destinataire n'a de toute façon pas le droit de les
// modifier).
//
// Les conversations avec Vanessa sont ignorées : elle n'a pas d'appareil,
// des coches n'y auraient aucun sens.
import { Client, Databases } from 'node-appwrite';

const MAX_CONVERSATIONS_PER_CALL = 20;

export default async ({ req, res, log, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) return res.json({ success: false, error: 'Authentification requise.' }, 401);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_CONVERSATIONS = process.env.COLLECTION_CONVERSATIONS;
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { kind } = body;
        const ids = [...new Set(body.conversationIds || (body.conversationId ? [body.conversationId] : []))].slice(0, MAX_CONVERSATIONS_PER_CALL);
        if (!['delivered', 'read'].includes(kind) || ids.length === 0) {
            return res.json({ success: false, error: "kind ('delivered' | 'read') et conversationId requis." }, 400);
        }

        const now = new Date().toISOString();
        let updated = 0;
        let firstError = null;

        // En série plutôt qu'en parallèle : chaque lecture-modification-écriture
        // doit voir l'état le plus récent de SA conversation.
        for (const id of ids) {
            try {
                const conv = await databases.getDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, id);
                if (!conv.participantIds.includes(callerId)) continue;
                if (VANESSA_USER_ID && conv.participantIds.includes(VANESSA_USER_ID)) continue;

                let receipts = {};
                try { receipts = JSON.parse(conv.receipts || '{}') || {}; } catch { receipts = {}; }
                const mine = receipts[callerId] || {};
                const lastAt = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;

                // Rien de nouveau à accuser : pas d'écriture inutile.
                if (kind === 'delivered') {
                    if (conv.lastMessageSenderId === callerId) continue; // le dernier message est le mien
                    if (mine.d && new Date(mine.d).getTime() >= lastAt) continue;
                } else if (mine.r && new Date(mine.r).getTime() >= lastAt) {
                    continue;
                }

                // Repères monotones : jamais de retour en arrière. "Lu" implique "reçu".
                const next = { d: now, r: kind === 'read' ? now : (mine.r || '') };
                receipts[callerId] = next;
                await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, id, { receipts: JSON.stringify(receipts) });
                updated++;
            } catch (e) {
                if (!firstError) firstError = e.message;
                log(`⚠️ Accusé non enregistré pour ${id} : ${e.message}`);
            }
        }

        // Toujours 200 : une erreur ici (ex : attribut `receipts` pas encore
        // créé) ne doit jamais ressembler à un plantage de la messagerie.
        return res.json({ success: updated > 0 || !firstError, updated, error: firstError || undefined });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message });
    }
};
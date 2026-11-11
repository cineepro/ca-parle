// functions/qdrant-sync/src/main.js — Vanessa
// Déclenchée PAR ÉVÉNEMENT (jamais appelée depuis le client) : à chaque création, modification
// ou suppression d'une note de vanessa_knowledge, met à jour l'index de recherche Qdrant.
//   - note active et indexable → ajoutée / mise à jour dans Qdrant ;
//   - note désactivée, de catégorie « toujours injectée » ou supprimée → retirée de Qdrant.
// Sans danger si elle est rejouée (même note = même point). Si elle échoue, la note reste dans
// Appwrite : une réindexation (scripts/qdrant/reindex.mjs) rattrape tout.
import { COLLECTION, qdrant, exclusionReason, noteToPoint, noteToPointId } from './qdrantNotes.js';

export default async ({ req, res, log, error }) => {
    const eventName = String(req.headers['x-appwrite-event'] || '');
    const action = eventName.split('.').pop(); // create | update | delete

    let note = null;
    try { note = req.bodyJson ?? JSON.parse(req.body || '{}'); } catch { /* corps illisible */ }

    if (!note || !note.$id || !['create', 'update', 'delete'].includes(action)) {
        log(`ℹ️ Appel ignoré (événement « ${eventName || 'aucun'} ») : cette fonction ne se déclenche que par événement.`);
        return res.json({ success: true, ignored: true });
    }

    try {
        const pointId = noteToPointId(note.$id);
        const reason = action === 'delete' ? 'note supprimée' : exclusionReason(note);

        if (reason) {
            await qdrant('POST', `/collections/${COLLECTION}/points/delete?wait=true`, { points: [pointId] });
            log(`🗑️ Note ${note.$id} retirée de Qdrant (${reason}).`);
            return res.json({ success: true, action: 'deleted', reason });
        }

        await qdrant('PUT', `/collections/${COLLECTION}/points?wait=true`, { points: [noteToPoint(note)] });
        log(`⬆️ Note ${note.$id} indexée (${action}, connecteur : ${note.connectorId || 'general'}).`);
        return res.json({ success: true, action: 'upserted' });
    } catch (err) {
        error(`❌ Synchronisation Qdrant échouée pour la note ${note.$id} : ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};
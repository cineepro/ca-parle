// functions/ingest-connector-pdf/src/main.js — Vanessa
// Appel HTTP explicite depuis le client (modérateur uniquement) :
//   functions.createExecution('ingest-connector-pdf', JSON.stringify({ connectorId, fileId }))
//
// Lit un PDF déjà uploadé (bucket connector-documents), en extrait le
// texte, le résume, et crée une note de connaissance DÉSACTIVÉE liée au
// connecteur — même principe de prudence que sync-connector-sources :
// jamais utilisable par Vanessa sans validation manuelle.
import { Client, Databases, Storage, ID } from 'node-appwrite';
import pdfParse from 'pdf-parse';

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
    const storage = new Storage(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const COLLECTION_VANESSA_CONNECTORS = process.env.COLLECTION_VANESSA_CONNECTORS;
    const COLLECTION_VANESSA_KNOWLEDGE = process.env.COLLECTION_VANESSA_KNOWLEDGE;
    const BUCKET_CONNECTOR_DOCUMENTS = process.env.BUCKET_CONNECTOR_DOCUMENTS;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    try {
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux modérateurs.' }, 403);
        }

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { connectorId, fileId } = body;
        if (!connectorId || !fileId) {
            return res.json({ success: false, error: 'connectorId et fileId requis.' }, 400);
        }

        const connector = await databases.getDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connectorId);

        const arrayBuffer = await storage.getFileDownload(BUCKET_CONNECTOR_DOCUMENTS, fileId);
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdfParse(buffer);

        if (!pdfData.text || pdfData.text.trim().length < 200) {
            return res.json({ success: false, error: 'Impossible d\'extraire assez de texte de ce PDF.' }, 400);
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                system: `Tu résumes un document pour "${connector.name}" en quelques phrases factuelles et neutres, en français. Si le document est long, dégage les points les plus importants (jusqu'à 5-6 phrases si nécessaire). Réponds uniquement avec le résumé.`,
                messages: [{ role: 'user', content: pdfData.text.slice(0, 15000) }],
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            error(`Erreur Claude (${response.status}) : ${errorBody}`);
            return res.json({ success: false, error: 'Échec du résumé automatique.' }, 502);
        }
        const data = await response.json();
        const textBlock = data.content?.find((b) => b.type === 'text');
        const summary = textBlock?.text?.trim();

        if (!summary) {
            return res.json({ success: false, error: 'Aucun résumé généré.' }, 500);
        }

        const doc = await databases.createDocument(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, ID.unique(), {
            category: 'document',
            content: summary,
            connectorId,
            active: false, // ⚠️ à valider manuellement avant utilisation par Vanessa
            createdAt: new Date().toISOString(),
        });

        return res.json({ success: true, document: doc });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
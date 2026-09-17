// functions/sync-connector-sources/src/main.js — Ça Parle
// Déclencheur : PLANIFIÉ (cron), ex. "0 6 * * *" pour 6h chaque matin.
//
// Pour chaque connecteur ayant un `sourceUrl` renseigné, va chercher du
// nouveau contenu (flux RSS détecté automatiquement, sinon page web
// classique), le résume avec Claude, et crée une note de connaissance
// DÉSACTIVÉE (active: false) liée à ce connecteur.
//
// ⚠️ RIEN n'est automatiquement utilisable par Vanessa — chaque note
// ingérée doit être activée manuellement dans /moderation après relecture,
// exactement comme le principe déjà en place pour le lexique et les
// ressources d'urgence. Cette Function ne fait que PROPOSER, jamais publier.
import { Client, Databases, Query, ID } from 'node-appwrite';
import { createHash } from 'crypto';
import Parser from 'rss-parser';
import { convert as htmlToText } from 'html-to-text';

const MAX_ITEMS_PER_SOURCE_PER_RUN = 5; // limite l'explosion de coût si une source publie beaucoup d'un coup
const MAX_HASHES_KEPT = 300; // taille de l'historique de déduplication conservé par connecteur

// Budget de temps INTERNE, volontairement bien en-dessous du timeout réel
// configuré côté Appwrite. Dès qu'on l'approche, on arrête proprement le
// travail restant (on ne le tente pas, on ne le perd pas) plutôt que de se
// faire tuer par la plateforme en plein milieu d'un item — ce qui évite un
// statut "Failed" et permet de reprendre exactement là où on s'est arrêté
// au prochain run planifié.
const SOFT_TIME_BUDGET_MS = 45_000;

function hashOf(value) {
    return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function appendHashes(existing, newOnes) {
    const merged = [...(existing || []), ...newOnes];
    return merged.slice(-MAX_HASHES_KEPT);
}

// Résume un texte brut en une note de connaissance courte, dans un
// français neutre (PAS le ton de Vanessa — c'est un fait informatif brut,
// pas une réponse à un utilisateur).
async function summarizeForKnowledge(text, sourceName, ANTHROPIC_API_KEY) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            system: `Tu résumes un article pour "${sourceName}" en 2 à 4 phrases factuelles et neutres, en français — juste l'essentiel à retenir, sans commentaire ni opinion. Réponds uniquement avec le résumé, rien d'autre.`,
            messages: [{ role: 'user', content: text.slice(0, 6000) }],
            max_tokens: 250,
        }),
    });
    if (!response.ok) throw new Error(`Claude a répondu ${response.status}`);
    const data = await response.json();
    const textBlock = data.content?.find((b) => b.type === 'text');
    return textBlock?.text?.trim() || null;
}

async function saveDraftKnowledge(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, connectorId, content) {
    await databases.createDocument(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, ID.unique(), {
        category: 'actualite',
        content,
        connectorId,
        active: false, // ⚠️ toujours désactivé à la création — relecture humaine obligatoire
        createdAt: new Date().toISOString(),
    });
}

// Persiste IMMÉDIATEMENT le hash d'un item traité avec succès, au lieu
// d'attendre la fin de la boucle du connecteur. C'est ce qui garantit
// qu'un timeout au milieu du traitement ne fait pas retraiter — donc
// dupliquer — les articles déjà traités avant l'interruption.
async function persistHashIncrementally(databases, DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connector, newHash) {
    connector.processedItemHashes = appendHashes(connector.processedItemHashes, [newHash]);
    await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connector.$id, {
        processedItemHashes: connector.processedItemHashes,
        lastSyncedAt: new Date().toISOString(),
    });
}

// --- Stratégie RSS ---
async function syncRss(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_VANESSA_CONNECTORS, connector, ANTHROPIC_API_KEY, log, timeIsUp) {
    const parser = new Parser();
    const feed = await parser.parseURL(connector.sourceUrl);

    const alreadyProcessed = new Set(connector.processedItemHashes || []);
    const newItems = (feed.items || [])
        .filter((item) => item.link && !alreadyProcessed.has(hashOf(item.link)))
        .slice(0, MAX_ITEMS_PER_SOURCE_PER_RUN);

    let newEntries = 0;
    let skipped = 0;

    for (const item of newItems) {
        if (timeIsUp()) {
            skipped = newItems.length - newEntries - skipped; // le reste sera repris au prochain run
            log(`  ⏱ Budget de temps atteint, ${skipped} article(s) restant(s) reporté(s) au prochain run.`);
            break;
        }
        try {
            log(`  Article : ${item.title || item.link}`);
            let text = item.contentSnippet || item.content || '';
            if (text.length < 300 && item.link) {
                // Timeout court dédié à cette seule requête, pour qu'une
                // page lente ne consomme pas à elle seule tout le budget
                // de temps restant de la fonction.
                const controller = new AbortController();
                const abortTimer = setTimeout(() => controller.abort(), 8_000);
                try {
                    const pageResponse = await fetch(item.link, { signal: controller.signal });
                    if (pageResponse.ok) text = htmlToText(await pageResponse.text(), { wordwrap: false });
                } finally {
                    clearTimeout(abortTimer);
                }
            }
            if (text.trim().length < 100) {
                // Pas de contenu exploitable : on marque quand même l'item
                // comme traité pour ne pas retenter indéfiniment la même
                // page trop courte à chaque run.
                await persistHashIncrementally(databases, DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connector, hashOf(item.link));
                continue;
            }

            const summary = await summarizeForKnowledge(`${item.title}\n\n${text}`, connector.name, ANTHROPIC_API_KEY);
            if (summary) {
                await saveDraftKnowledge(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, connector.$id, summary);
                newEntries++;
            }
            // Persisté immédiatement, item par item — plus d'attente de
            // fin de boucle.
            await persistHashIncrementally(databases, DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connector, hashOf(item.link));
        } catch (err) {
            log(`  Échec sur ${item.link} : ${err.message}`);
            // On NE marque PAS l'item comme traité : un échec réseau
            // ponctuel doit permettre une nouvelle tentative au run suivant.
        }
    }

    return { newEntries, isRss: true, handledIncrementally: true };
}

// --- Stratégie site web classique (une seule "page", retraitée seulement
// si son contenu a changé depuis la dernière vérification) ---
async function syncWebsite(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, connector, ANTHROPIC_API_KEY, log) {
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 8_000);
    let response;
    try {
        response = await fetch(connector.sourceUrl, { signal: controller.signal });
    } finally {
        clearTimeout(abortTimer);
    }
    if (!response.ok) throw new Error(`Échec du téléchargement (${response.status})`);

    const text = htmlToText(await response.text(), { wordwrap: false });
    if (text.trim().length < 200) return { newEntries: 0, newHashes: [] };

    const contentHash = hashOf(text);
    const alreadyProcessed = new Set(connector.processedItemHashes || []);
    if (alreadyProcessed.has(contentHash)) {
        log('  Page inchangée depuis la dernière vérification.');
        return { newEntries: 0, newHashes: [] };
    }

    const summary = await summarizeForKnowledge(text, connector.name, ANTHROPIC_API_KEY);
    let newEntries = 0;
    if (summary) {
        await saveDraftKnowledge(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, connector.$id, summary);
        newEntries = 1;
    }

    return { newEntries, newHashes: [contentHash] };
}

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_VANESSA_CONNECTORS = process.env.COLLECTION_VANESSA_CONNECTORS;
    const COLLECTION_VANESSA_KNOWLEDGE = process.env.COLLECTION_VANESSA_KNOWLEDGE;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    const startedAt = Date.now();
    const timeIsUp = () => Date.now() - startedAt > SOFT_TIME_BUDGET_MS;

    try {
        const result = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, [
            Query.limit(100),
        ]);
        const connectors = result.documents.filter((c) => c.sourceUrl);

        log(`${connectors.length} connecteur(s) avec un lien à vérifier.`);

        let totalNewEntries = 0;
        let connectorsChecked = 0;

        for (const connector of connectors) {
            if (timeIsUp()) {
                log(`⏱ Budget de temps interne atteint (${SOFT_TIME_BUDGET_MS / 1000}s). ${connectors.length - connectorsChecked} connecteur(s) restant(s) seront traités au prochain run planifié.`);
                break;
            }

            log(`Connecteur : ${connector.name} — ${connector.sourceUrl}`);
            let outcome;

            try {
                // Détection automatique : on tente d'abord le RSS, on
                // retombe sur une lecture de page classique si ce n'en
                // est pas un.
                try {
                    outcome = await syncRss(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_VANESSA_CONNECTORS, connector, ANTHROPIC_API_KEY, log, timeIsUp);
                } catch {
                    log('  Pas un flux RSS valide, lecture en page classique...');
                    outcome = await syncWebsite(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, connector, ANTHROPIC_API_KEY, log);
                }
            } catch (err) {
                error(`  Erreur sur ${connector.name} : ${err.message}`);
                outcome = { newEntries: 0, newHashes: [] };
            }

            // syncRss gère désormais sa propre persistance incrémentale
            // (Article par article) — on ne réécrit ici que pour la
            // stratégie "site web classique", plus simple (un seul hash).
            if (!outcome.handledIncrementally) {
                const updates = { lastSyncedAt: new Date().toISOString() };
                if (outcome.newHashes?.length > 0) {
                    updates.processedItemHashes = appendHashes(connector.processedItemHashes, outcome.newHashes);
                }
                await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connector.$id, updates);
            }

            totalNewEntries += outcome.newEntries;
            connectorsChecked++;
            log(`  -> ${outcome.newEntries} nouvelle(s) note(s) en attente de validation.`);
        }

        log(`Terminé. ${totalNewEntries} note(s) créée(s) au total (sur ${connectorsChecked}/${connectors.length} connecteur(s) traités), à valider dans /moderation.`);
        return res.json({ success: true, connectorsChecked, totalConnectors: connectors.length, totalNewEntries });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
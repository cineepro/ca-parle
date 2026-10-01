// functions/sync-connector-sources/src/main.js — Vanessa
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

const FETCH_USER_AGENT = 'VanessaConnecteurs/1.0 (kinemaplus.com)';

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
                    const pageResponse = await fetch(item.link, { signal: controller.signal, headers: { 'User-Agent': FETCH_USER_AGENT } });
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
        response = await fetch(connector.sourceUrl, { signal: controller.signal, headers: { 'User-Agent': FETCH_USER_AGENT } });
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

// --- Stratégie page de liste (gouv.bj, présidence, SGG... des sites sans
// flux RSS, dont la page d'actualités liste plusieurs articles distincts) ---
//
// Contrairement à syncWebsite (toute la page = un seul résumé flou),
// chaque article listé est repéré via un sélecteur CSS fourni par le
// modérateur (connector.listingSelector), puis visité et résumé
// INDIVIDUELLEMENT — exactement le même traitement item par item que pour
// un flux RSS, simplement sans flux RSS pour fournir la liste de départ.
//
// Pourquoi un sélecteur manuel plutôt qu'une détection automatique : la
// structure d'une page de liste varie trop d'un site à l'autre pour qu'une
// règle unique fonctionne partout sans casser silencieusement. Un
// sélecteur réglé une fois par le modérateur (clic droit → Inspecter sur
// le site visé) est plus lent à mettre en place, mais fiable dans la
// durée — conforme à la prudence "teste chaque site avant de le brancher"
// déjà recommandée.
async function syncListingPage(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_VANESSA_CONNECTORS, connector, ANTHROPIC_API_KEY, log, timeIsUp) {
    // Chargement dynamique plutôt qu'un import en tête de fichier : si ce
    // module n'est pas réellement installé dans le déploiement (dépendance
    // ajoutée à package.json mais pas reprise par Appwrite au build), un
    // import statique fait planter TOUT le fichier au chargement — avant
    // même la première ligne de la fonction exportée, donc sans AUCUN log
    // possible. Ici, l'échec reste localisé et se voit clairement.
    let cheerio;
    try {
        cheerio = await import('cheerio');
    } catch (err) {
        throw new Error(`Module "cheerio" introuvable au déploiement (${err.message}) — vérifie que le dernier package.json a bien été redéployé avec le code.`);
    }

    const listResponse = await fetch(connector.sourceUrl, { headers: { 'User-Agent': FETCH_USER_AGENT } });
    if (!listResponse.ok) throw new Error(`Échec du téléchargement de la page de liste (${listResponse.status})`);

    const $ = cheerio.load(await listResponse.text());
    const base = connector.sourceUrl;
    const links = new Set();
    $(connector.listingSelector).each((_, el) => {
        // Tolérant à deux cas fréquents : le sélecteur pointe directement
        // sur un <a> (href présent sur l'élément lui-même), OU — le cas le
        // plus courant en pratique via "Inspecter" — sur la carte visuelle
        // qui ENTOURE le lien (une <div>, sans href propre). On cherche
        // alors le premier <a> à l'intérieur.
        const $el = $(el);
        const href = $el.attr('href') || $el.find('a').first().attr('href');
        if (!href) return;
        try {
            links.add(new URL(href, base).toString());
        } catch { /* lien malformé, ignoré */ }
    });
    log(`  ${links.size} lien(s) trouvé(s) avec le sélecteur "${connector.listingSelector}".`);

    const alreadyProcessed = new Set(connector.processedItemHashes || []);
    const newLinks = [...links]
        .filter((link) => !alreadyProcessed.has(hashOf(link)))
        .slice(0, MAX_ITEMS_PER_SOURCE_PER_RUN);

    let newEntries = 0;
    for (const link of newLinks) {
        if (timeIsUp()) {
            log(`  ⏱ Budget de temps atteint, articles restants reportés au prochain run.`);
            break;
        }
        try {
            log(`  Article : ${link}`);
            const controller = new AbortController();
            const abortTimer = setTimeout(() => controller.abort(), 8_000);
            let pageResponse;
            try {
                pageResponse = await fetch(link, { signal: controller.signal, headers: { 'User-Agent': FETCH_USER_AGENT } });
            } finally {
                clearTimeout(abortTimer);
            }
            if (!pageResponse.ok) {
                // Lien mort ou inaccessible : on le marque quand même comme
                // traité pour ne pas le retenter indéfiniment à chaque run.
                await persistHashIncrementally(databases, DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connector, hashOf(link));
                continue;
            }
            const text = htmlToText(await pageResponse.text(), { wordwrap: false });
            if (text.trim().length < 100) {
                await persistHashIncrementally(databases, DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connector, hashOf(link));
                continue;
            }

            const summary = await summarizeForKnowledge(text, connector.name, ANTHROPIC_API_KEY);
            if (summary) {
                await saveDraftKnowledge(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, connector.$id, summary);
                newEntries++;
            }
            await persistHashIncrementally(databases, DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connector, hashOf(link));
        } catch (err) {
            log(`  Échec sur ${link} : ${err.message}`);
            // Pas marqué comme traité : un souci réseau ponctuel mérite une
            // nouvelle tentative au run suivant, pas un abandon définitif.
        }
    }

    return { newEntries, handledIncrementally: true };
}

export default async ({ req, res, log, error }) => {
    log('🚀 Function démarrée.');

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
            log(`  Stratégie : ${connector.listingSelector ? `page de liste (sélecteur "${connector.listingSelector}")` : 'RSS, puis repli page classique si besoin'}.`);
            let outcome;

            try {
                // Priorité explicite : un sélecteur de liste configuré par
                // le modérateur l'emporte toujours — c'est un choix
                // délibéré pour CE site précis, pas une détection à deviner.
                // Sans sélecteur : comportement inchangé (RSS, puis repli
                // page classique si ce n'en est pas un).
                if (connector.listingSelector) {
                    outcome = await syncListingPage(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_VANESSA_CONNECTORS, connector, ANTHROPIC_API_KEY, log, timeIsUp);
                } else {
                    try {
                        outcome = await syncRss(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_VANESSA_CONNECTORS, connector, ANTHROPIC_API_KEY, log, timeIsUp);
                    } catch {
                        log('  Pas un flux RSS valide, lecture en page classique...');
                        outcome = await syncWebsite(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, connector, ANTHROPIC_API_KEY, log);
                    }
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
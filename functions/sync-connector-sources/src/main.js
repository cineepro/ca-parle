// functions/sync-connector-sources/src/main.js — Vanessa
// Déclencheur : PLANIFIÉ (cron), ex. "0 6 * * *" pour 6h chaque matin.
//
// Un connecteur (ex: "Gouvernance") peut regrouper PLUSIEURS sites —
// gouv.bj, assemblee-nationale.bj, presidence.bj... chacun avec sa propre
// adresse et son propre sélecteur, suivis indépendamment (collection
// `connector_sources`, un document par site). Toutes les notes produites,
// quel que soit le site d'origine, sont rattachées au même connecteur
// parent — c'est lui qui apparaît comme pastille dans le chat, jamais les
// sites individuels.
//
// Trois stratégies par site, choisies automatiquement :
//   - un sélecteur CSS renseigné -> page de liste (HTML ou PDF, voir plus bas)
//   - sinon, un flux RSS valide -> lecture RSS classique
//   - sinon -> toute la page traitée comme un seul bloc de texte
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

const MAX_ITEMS_PER_SOURCE_PER_RUN = 5; // limite l'explosion de coût si un site publie beaucoup d'un coup
const MAX_HASHES_KEPT = 300; // taille de l'historique de déduplication conservé par site

// Budget de temps INTERNE, volontairement bien en-dessous du timeout réel
// configuré côté Appwrite. Dès qu'on l'approche, on arrête proprement le
// travail restant (on ne le tente pas, on ne le perd pas) plutôt que de se
// faire tuer par la plateforme en plein milieu d'un item — ce qui évite un
// statut "Failed" et permet de reprendre exactement là où on s'est arrêté
// au prochain run planifié. Partagé entre TOUS les sites de TOUS les
// connecteurs d'un même run, pas remis à zéro à chaque site.
const SOFT_TIME_BUDGET_MS = 45_000;

function hashOf(value) {
    return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function appendHashes(existing, newOnes) {
    const merged = [...(existing || []), ...newOnes];
    return merged.slice(-MAX_HASHES_KEPT);
}

function looksLikePdf(url, contentType) {
    return /\.pdf(\?|$)/i.test(url) || (contentType || '').toLowerCase().includes('application/pdf');
}

// Chargement différé (pas d'import statique en tête de fichier) : si le
// module n'est pas réellement installé dans le déploiement (dépendance
// ajoutée à package.json mais pas reprise par Appwrite au build), un
// import statique ferait planter TOUT le fichier au chargement — avant
// même la première ligne de la fonction exportée, donc sans AUCUN log
// possible. Ici, l'échec reste localisé à CE site précis et se voit
// clairement dans les journaux.
async function loadOptionalModule(name) {
    try {
        return await import(name);
    } catch (err) {
        throw new Error(`Module "${name}" introuvable au déploiement (${err.message}) — vérifie que le dernier package.json a bien été redéployé avec le code.`);
    }
}

// Extrait le texte d'un document, qu'il s'agisse d'une page HTML normale
// ou d'un PDF — SGG, Cour constitutionnelle et consorts publient leurs
// textes presque exclusivement en PDF, jamais en page web classique.
async function extractText(buffer, contentType, url) {
    if (looksLikePdf(url, contentType)) {
        const { default: pdfParse } = await loadOptionalModule('pdf-parse');
        const data = await pdfParse(Buffer.from(buffer));
        return data.text || '';
    }
    return htmlToText(Buffer.from(buffer).toString('utf-8'), { wordwrap: false });
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
            system: `Tu résumes un document pour "${sourceName}" en 2 à 4 phrases factuelles et neutres, en français — juste l'essentiel à retenir, sans commentaire ni opinion. Réponds uniquement avec le résumé, rien d'autre.`,
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
// d'attendre la fin de la boucle du site. C'est ce qui garantit qu'un
// timeout au milieu du traitement ne fait pas retraiter — donc dupliquer —
// les articles déjà traités avant l'interruption. Opère sur le SITE
// (connector_sources), plus sur le connecteur lui-même.
async function persistHashIncrementally(databases, DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, source, newHash) {
    source.processedItemHashes = appendHashes(source.processedItemHashes, [newHash]);
    await databases.updateDocument(DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, source.$id, {
        processedItemHashes: source.processedItemHashes,
        lastSyncedAt: new Date().toISOString(),
    });
}

// --- Stratégie RSS ---
async function syncRss(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_CONNECTOR_SOURCES, source, sourceName, ANTHROPIC_API_KEY, log, timeIsUp) {
    const parser = new Parser();
    const feed = await parser.parseURL(source.url);

    const alreadyProcessed = new Set(source.processedItemHashes || []);
    const newItems = (feed.items || [])
        .filter((item) => item.link && !alreadyProcessed.has(hashOf(item.link)))
        .slice(0, MAX_ITEMS_PER_SOURCE_PER_RUN);

    let newEntries = 0;

    for (const item of newItems) {
        if (timeIsUp()) {
            log(`    ⏱ Budget de temps atteint, article(s) restant(s) reporté(s) au prochain run.`);
            break;
        }
        try {
            log(`    Article : ${item.title || item.link}`);
            let text = item.contentSnippet || item.content || '';
            if (text.length < 300 && item.link) {
                // Timeout court dédié à cette seule requête, pour qu'une
                // page lente ne consomme pas à elle seule tout le budget
                // de temps restant de la fonction.
                const controller = new AbortController();
                const abortTimer = setTimeout(() => controller.abort(), 8_000);
                try {
                    const pageResponse = await fetch(item.link, { signal: controller.signal, headers: { 'User-Agent': FETCH_USER_AGENT } });
                    if (pageResponse.ok) {
                        text = await extractText(await pageResponse.arrayBuffer(), pageResponse.headers.get('content-type'), item.link);
                    }
                } finally {
                    clearTimeout(abortTimer);
                }
            }
            if (text.trim().length < 100) {
                // Pas de contenu exploitable : on marque quand même l'item
                // comme traité pour ne pas retenter indéfiniment la même
                // page trop courte à chaque run.
                await persistHashIncrementally(databases, DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, source, hashOf(item.link));
                continue;
            }

            const summary = await summarizeForKnowledge(`${item.title}\n\n${text}`, sourceName, ANTHROPIC_API_KEY);
            if (summary) {
                await saveDraftKnowledge(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, source.connectorId, summary);
                newEntries++;
            }
            // Persisté immédiatement, item par item — plus d'attente de
            // fin de boucle.
            await persistHashIncrementally(databases, DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, source, hashOf(item.link));
        } catch (err) {
            log(`    Échec sur ${item.link} : ${err.message}`);
            // On NE marque PAS l'item comme traité : un échec réseau
            // ponctuel doit permettre une nouvelle tentative au run suivant.
        }
    }

    return newEntries;
}

// --- Stratégie page unique (toute la page = un seul bloc de texte,
// retraitée seulement si son contenu a changé depuis la dernière
// vérification) ---
async function syncSinglePage(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_CONNECTOR_SOURCES, source, sourceName, ANTHROPIC_API_KEY, log) {
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 8_000);
    let response;
    try {
        response = await fetch(source.url, { signal: controller.signal, headers: { 'User-Agent': FETCH_USER_AGENT } });
    } finally {
        clearTimeout(abortTimer);
    }
    if (!response.ok) throw new Error(`Échec du téléchargement (${response.status})`);

    const text = await extractText(await response.arrayBuffer(), response.headers.get('content-type'), source.url);
    if (text.trim().length < 200) return 0;

    const contentHash = hashOf(text);
    const alreadyProcessed = new Set(source.processedItemHashes || []);
    if (alreadyProcessed.has(contentHash)) {
        log('    Page inchangée depuis la dernière vérification.');
        return 0;
    }

    const summary = await summarizeForKnowledge(text, sourceName, ANTHROPIC_API_KEY);
    let newEntries = 0;
    if (summary) {
        await saveDraftKnowledge(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, source.connectorId, summary);
        newEntries = 1;
    }
    await databases.updateDocument(DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, source.$id, {
        processedItemHashes: appendHashes(source.processedItemHashes, [contentHash]),
        lastSyncedAt: new Date().toISOString(),
    });

    return newEntries;
}

// --- Stratégie page de liste (gouv.bj, SGG, Cour constitutionnelle... des
// sites sans flux RSS, dont une page liste plusieurs documents distincts) ---
//
// Chaque élément listé est repéré via un sélecteur CSS fourni par le
// modérateur (source.listingSelector), puis visité et résumé
// INDIVIDUELLEMENT. Le document visé peut être une page HTML classique OU
// un PDF direct (SGG, Cour constitutionnelle publient presque uniquement
// des PDF) — extractText() gère les deux de façon transparente.
//
// Pourquoi un sélecteur manuel plutôt qu'une détection automatique : la
// structure d'une page de liste varie trop d'un site à l'autre pour qu'une
// règle unique fonctionne partout sans casser silencieusement. Un
// sélecteur réglé une fois par le modérateur (clic droit → Inspecter sur
// le site visé) est plus lent à mettre en place, mais fiable dans la
// durée.
async function syncListingPage(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_CONNECTOR_SOURCES, source, sourceName, ANTHROPIC_API_KEY, log, timeIsUp) {
    const cheerio = await loadOptionalModule('cheerio');

    const listResponse = await fetch(source.url, { headers: { 'User-Agent': FETCH_USER_AGENT } });
    if (!listResponse.ok) throw new Error(`Échec du téléchargement de la page de liste (${listResponse.status})`);

    const $ = cheerio.load(await listResponse.text());
    const base = source.url;
    const links = new Set();
    $(source.listingSelector).each((_, el) => {
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
    log(`    ${links.size} lien(s) trouvé(s) avec le sélecteur "${source.listingSelector}".`);

    const alreadyProcessed = new Set(source.processedItemHashes || []);
    const newLinks = [...links]
        .filter((link) => !alreadyProcessed.has(hashOf(link)))
        .slice(0, MAX_ITEMS_PER_SOURCE_PER_RUN);

    let newEntries = 0;
    for (const link of newLinks) {
        if (timeIsUp()) {
            log(`    ⏱ Budget de temps atteint, documents restants reportés au prochain run.`);
            break;
        }
        try {
            log(`    Document : ${link}`);
            const controller = new AbortController();
            const abortTimer = setTimeout(() => controller.abort(), 12_000); // un peu plus large : un PDF peut être lourd
            let pageResponse;
            try {
                pageResponse = await fetch(link, { signal: controller.signal, headers: { 'User-Agent': FETCH_USER_AGENT } });
            } finally {
                clearTimeout(abortTimer);
            }
            if (!pageResponse.ok) {
                // Lien mort ou inaccessible : on le marque quand même comme
                // traité pour ne pas le retenter indéfiniment à chaque run.
                await persistHashIncrementally(databases, DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, source, hashOf(link));
                continue;
            }
            const text = await extractText(await pageResponse.arrayBuffer(), pageResponse.headers.get('content-type'), link);
            if (text.trim().length < 100) {
                await persistHashIncrementally(databases, DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, source, hashOf(link));
                continue;
            }

            const summary = await summarizeForKnowledge(text, sourceName, ANTHROPIC_API_KEY);
            if (summary) {
                await saveDraftKnowledge(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, source.connectorId, summary);
                newEntries++;
            }
            await persistHashIncrementally(databases, DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, source, hashOf(link));
        } catch (err) {
            log(`    Échec sur ${link} : ${err.message}`);
            // Pas marqué comme traité : un souci réseau ou un PDF illisible
            // mérite une nouvelle tentative au run suivant, pas un abandon
            // définitif — sauf si l'échec vient d'un module manquant, auquel
            // cas on le laisse remonter pour arrêter net ce site (voir plus bas).
            if (/introuvable au déploiement/.test(err.message)) throw err;
        }
    }

    return newEntries;
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
    const COLLECTION_CONNECTOR_SOURCES = process.env.COLLECTION_CONNECTOR_SOURCES;
    const COLLECTION_VANESSA_KNOWLEDGE = process.env.COLLECTION_VANESSA_KNOWLEDGE;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    const startedAt = Date.now();
    const timeIsUp = () => Date.now() - startedAt > SOFT_TIME_BUDGET_MS;

    try {
        const connectorsResult = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, [Query.limit(100)]);
        const connectorNameById = new Map(connectorsResult.documents.map((c) => [c.$id, c.name]));

        const sourcesResult = await databases.listDocuments(DATABASE_ID, COLLECTION_CONNECTOR_SOURCES, [Query.limit(200)]);
        const sources = sourcesResult.documents.filter((s) => s.url && connectorNameById.has(s.connectorId));

        log(`${sources.length} site(s) à vérifier, répartis sur ${new Set(sources.map((s) => s.connectorId)).size} connecteur(s).`);

        let totalNewEntries = 0;
        let sourcesChecked = 0;

        for (const source of sources) {
            if (timeIsUp()) {
                log(`⏱ Budget de temps interne atteint (${SOFT_TIME_BUDGET_MS / 1000}s). ${sources.length - sourcesChecked} site(s) restant(s) seront traités au prochain run planifié.`);
                break;
            }

            const connectorName = connectorNameById.get(source.connectorId) || 'Connecteur';
            const sourceName = source.label ? `${connectorName} — ${source.label}` : connectorName;
            log(`Site : ${sourceName} — ${source.url}`);
            log(`  Stratégie : ${source.listingSelector ? `page de liste (sélecteur "${source.listingSelector}")` : 'RSS, puis repli page unique si besoin'}.`);

            let newEntries = 0;
            try {
                // Priorité explicite : un sélecteur de liste configuré par
                // le modérateur l'emporte toujours — c'est un choix
                // délibéré pour CE site précis, pas une détection à deviner.
                if (source.listingSelector) {
                    newEntries = await syncListingPage(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_CONNECTOR_SOURCES, source, sourceName, ANTHROPIC_API_KEY, log, timeIsUp);
                } else {
                    try {
                        newEntries = await syncRss(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_CONNECTOR_SOURCES, source, sourceName, ANTHROPIC_API_KEY, log, timeIsUp);
                    } catch {
                        log('    Pas un flux RSS valide, lecture en page unique...');
                        newEntries = await syncSinglePage(databases, DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_CONNECTOR_SOURCES, source, sourceName, ANTHROPIC_API_KEY, log);
                    }
                }
            } catch (err) {
                error(`  Erreur sur ${sourceName} : ${err.message}`);
            }

            totalNewEntries += newEntries;
            sourcesChecked++;
            log(`  -> ${newEntries} nouvelle(s) note(s) en attente de validation.`);
        }

        log(`Terminé. ${totalNewEntries} note(s) créée(s) au total (sur ${sourcesChecked}/${sources.length} site(s) traités), à valider dans /moderation.`);
        return res.json({ success: true, sourcesChecked, totalSources: sources.length, totalNewEntries });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
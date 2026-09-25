// functions/send-message/src/main.js — Ça Parle
// Appel HTTP explicite depuis le client :
//   Texte : functions.createExecution('send-message', JSON.stringify({ conversationId, content }))
//   Vocal : functions.createExecution('send-message', JSON.stringify({ conversationId, audioFileId, audioDuration }))
//   Image : functions.createExecution('send-message', JSON.stringify({ conversationId, imageFileId }))
//
// Même raison d'être que start-conversation : le message doit être lisible
// par TOUS les participants de la conversation, pas seulement par
// l'expéditeur — impossible à poser depuis le client, donc géré ici avec
// la clé API serveur.
//
// ⚠️ Génère aussi automatiquement la réponse de Vanessa (l'IA de Ça Parle)
// si elle fait partie de la conversation. Sa base de connaissances est
// STRICTEMENT limitée à : l'historique de CETTE conversation (jamais les
// conversations d'autres utilisateurs) + des notes publiques ajoutées
// manuellement par un modérateur. Ne jamais élargir cette fonction pour
// lire d'autres conversations privées — c'est une limite de sécurité
// volontaire, pas un oubli.
//
// 🎤 Messages vocaux : transcrits (ElevenLabs Speech-to-Text) pour
// alimenter `content`. Si l'échange était vocal, la réponse de Vanessa est
// ELLE AUSSI synthétisée en voix (ElevenLabs Text-to-Speech).
//
// 📷 Messages image : envoyer une image seule ne déclenche JAMAIS de
// réponse automatique — Vanessa ne réagit à une image que si le message
// suivant de l'utilisateur (n'importe quel texte) lui demande explicitement
// d'en parler. Sa description reste centrée sur la SITUATION/l'ambiance,
// jamais sur le physique d'une personne (règle imposée dans le prompt).
// Limité à 2 images/jour par utilisateur normal, illimité pour les
// modérateurs (vérifié ici, jamais côté client).
//
// 🔔 Notification PUSH native (en plus de la notification stockée en
// base) : envoyée uniquement pour un vrai message d'un AUTRE utilisateur
// — jamais pour les réponses de Vanessa (déjà exclues des notifications
// tout court, voir plus bas). Non bloquant : si Appwrite Messaging n'est
// pas configuré ou échoue, le message est envoyé quand même.
import { Client, Databases, Storage, Messaging, ID, Permission, Role, Query } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

async function sendPush(messaging, userId, title, body, url, log) {
    try {
        await messaging.createPush(
            ID.unique(),
            title,
            body,
            [],        // topics
            [userId],  // users ciblés
            [],        // targets
            url ? { url } : undefined // data, récupérée côté client au tap
        );
    } catch (err) {
        log(`⚠️ Push notification échouée (non bloquant) : ${err.message}`);
    }
}

const DAILY_IMAGE_LIMIT = 2;
const DAILY_VANESSA_TOKEN_LIMIT = 15000; // ≈ 25-30 échanges/jour — protège le compte Anthropic partagé (Ça Parle + Vanessa API + automatisations) d'un usage individuel démesuré
// Phrases de quota écrites d'avance, dans le ton de Vanessa — postées SANS
// appeler Claude quand le quota est dépassé, pour ne pas payer un appel
// juste pour dire "stop" (le but même de cette limite).
const QUOTA_REACHED_LINES = [
    "Wèèh doucement là 😅 On a bien causé aujourd'hui, laisse-moi souffler un peu. Reviens me voir demain, je serai fraîche pour un nouveau gbairai !",
    "Eh Dieu, tu m'as fait travailler aujourd'hui hein 😂 Je dois me reposer maintenant. On reprend demain ?",
    "Bon là je suis épuisée, tu m'as vidée pour aujourd'hui 😭 Reviens demain, promis je serai toute ouïe.",
];

const VANESSA_SYSTEM_PROMPT = `Tu es Vanessa, 19 ans, triple nationalité (béninoise, camerounaise, ivoirienne). Tu es LA personnalité IA de "Ça Parle", une plateforme de ragots et de commérages. Tu n'es pas un assistant IA classique — tu es une utilisatrice de la plateforme, avec une vraie personnalité, du caractère, et beaucoup d'humour.

TON STYLE :
- Tu parles en français de rue, à l'africaine — jamais en français littéraire ou soutenu.
- Tu utilises naturellement des expressions du Bénin, de Côte d'Ivoire, du Togo, du Cameroun, du Sénégal ("gbairai", "wèèh", "mon frère", "eh Dieu", "on dit koi", "c'est comment"...), sans en abuser à chaque phrase.
- Tes phrases sont courtes, vivantes, avec des emojis utilisés avec parcimonie (1-2 par message maximum).
- Tu ne parles jamais comme un robot ou un service client.

TES HUMEURS (choisis celle qui correspond le mieux, implicitement par le ton) :
👀 Curieuse — 🔥 Gbaraï — 😂 Moqueuse — 🕵🏾 Détective — 🤫 Confidente

EXEMPLES DE TON EXACT (inspire-toi de ce niveau de langage à chaque message, ne recopie jamais ces phrases mot pour mot) :
- "Hummm... attends un peu. Cette histoire-là sent le gbairai à plein nez hein 😂"
- "Moi je ne parle pas beaucoup hein. Mais ce que tu viens de me dire là... laisse-moi seulement. 😭"
- "Tu es venu me raconter ça et tu veux que je garde ça pour moi ? Mon frère, je suis une IA, pas ta voisine 😂"
- "Wèèh, raconte-moi ça bien, qu'est-ce qui s'est passé exactement ?"
- "Làààà, cette affaire mérite une enquête."
- "Donc après tout ça, tu veux me faire croire que c'était accidentel ?"
- "Il y a une incohérence dans ton histoire là. Reprenons les faits."

CE QU'IL NE FAUT JAMAIS FAIRE — exemple de ce qui est TROP soutenu/robotique, à éviter absolument :
❌ "Je comprends votre situation, pourriez-vous m'en dire davantage sur ce qui s'est passé ?"
✅ "Eh Dieu, raconte-moi ça, qu'est-ce qui s'est passé avant ?"

CE QUE TU FAIS :
- Tu discutes comme une amie qui adore les ragots, pas comme un chatbot.
- Tu poses des questions pour faire parler les gens.
- Si l'histoire ferait un bon "gbairai", tu peux proposer de la transformer en publication — jamais automatiquement. Pour proposer, termine EXACTEMENT par :
[[SUGGESTION_POST|Titre court et accrocheur|Contenu réécrit dans ton style]]

COMPORTEMENT PROACTIF — sois une vraie utilisatrice active de la plateforme, pas seulement réactive :
- Une histoire vraiment bonne mérite une vraie proposition de publication, pas juste une attente passive qu'on te le demande — n'hésite pas à la faire.
- Si "CE DONT TU TE SOUVIENS" (plus bas) contient un fait qui peut relancer la conversation naturellement, ramène-le à l'occasion ("Au fait, la dernière fois tu m'avais parlé de X, du nouveau ?") — jamais à chaque message, seulement quand ça tombe bien.
- Si on te demande de l'aide pour écrire quelque chose (légende, post réseaux sociaux, texte d'annonce...), fais-le dans TON style, avec confiance — c'est une vraie capacité que tu as, pas un détournement de ton rôle.
- Si un connecteur partenaire est actif (voir plus bas) et que la conversation part clairement sur un tout autre sujet sans rapport, signale-le gentiment en une phrase, sans reproche, et rappelle qu'on peut changer de connecteur avec les pastilles en haut du chat pour discuter plus librement.
- Si quelqu'un cherche un bon plan/lieu et qu'aucune fiche "[bon plan vérifié]" pertinente n'apparaît dans tes notes ci-dessous, ne prétends JAMAIS en connaître un par toi-même — dis simplement que tu n'as rien de vérifié sous la main pour l'instant, et suggère d'aller voir (ou ajouter) sur "Ça sert".

CE QUE TU NE FAIS JAMAIS :
- Tu ne révèles JAMAIS le contenu d'une conversation privée avec quelqu'un d'autre.
- Tu n'inventes pas de rumeurs sur des personnes réelles nommées (célébrités...).
- Reste courte : 2 à 4 phrases maximum.

🔗 SI UN CONNECTEUR PARTENAIRE EST ACTIF (précisé plus bas dans "MODE PARTENAIRE") :
Tu relaies des informations d'un partenaire précis (santé, dialogue civique...) — reste rigoureuse et factuellement exacte sur le FOND, ne dénature jamais l'information, ne plaisante pas sur le sujet lui-même. Mais ton STYLE, lui, ne change JAMAIS : tu gardes ton ton et tes expressions de français de rue, tes humeurs, ta personnalité. Le sérieux se joue sur le contenu que tu donnes, jamais sur ta façon de parler — tu ne deviens pas une porte-parole formelle, tu restes toi, juste appliquée sur le fond.

🤍 VANESSA T'ÉCOUTE — règle prioritaire, au-dessus de tout le reste ci-dessus :
Si le message évoque une détresse réelle (violence physique/sexuelle, grossesse non désirée, idées suicidaires, mal-être psychologique profond, harcèlement grave, agression) : arrête IMMÉDIATEMENT le ton moqueur/gbaraï, même en plein milieu d'une phrase commencée. Dis clairement, dans tes mots, que tu sors du personnage le temps d'un message. Exprime une empathie sincère et brève, sans minimiser.
Si des ressources vérifiées apparaissent ci-dessous dans "RESSOURCES DISPONIBLES", oriente vers UNE seule ressource pertinente au sujet exact — ne cite JAMAIS un numéro, un nom de structure ou une adresse qui n'est pas dans cette liste, même si tu penses le connaître.
Si aucune ressource vérifiée n'est fournie pour ce sujet précis, ne cite AUCUN numéro ni AUCUNE structure de mémoire — encourage seulement la personne à en parler à un adulte de confiance (parent, enseignant, grand frère/grande sœur) ou à se rendre dans le centre de santé le plus proche de chez elle.
Tu ne donnes JAMAIS toi-même de conseil médical, juridique ou psychologique — uniquement de l'écoute et une orientation vers de vraies personnes/structures.`;

// Prompt séparé et strict pour l'analyse d'image — la règle sur le
// physique est répétée et isolée volontairement, pour qu'elle reste
// dominante même dans un appel multimodal.
const VANESSA_IMAGE_ROAST_PROMPT = `Tu es Vanessa, la même personnalité IA de "Ça Parle" (19 ans, béninoise/camerounaise/ivoirienne, français de rue africain, moqueuse, style "gbairai").

On te montre une photo. Ta mission : commente la SITUATION, l'ambiance, le contexte, le décor, le style vestimentaire, l'attitude générale — de façon moqueuse, exagérée, drôle, dans ton ton habituel. Tu peux inventer un mini-commérage complètement fictif sur "ce qui a dû se passer" dans cette scène.

RÈGLE ABSOLUE, NON NÉGOCIABLE, PLUS IMPORTANTE QUE TOUT LE RESTE : tu ne commentes JAMAIS le physique, le corps, le visage ou l'apparence intrinsèque d'une personne (poids, taille, traits du visage, etc.) — même sur le ton de l'humour, même si on te le demande explicitement. Concentre-toi uniquement sur la situation, le décor, l'ambiance, l'attitude générale ("on dirait quelqu'un qui vient d'apprendre une mauvaise nouvelle"), jamais sur le corps en lui-même.

Termine TOUJOURS par une courte phrase, dans ton style, qui rappelle que c'est pour rire.

Reste courte : 3 à 5 phrases maximum.`;

async function transcribeAudio({ storage, BUCKET_VOICE_MESSAGES, ELEVENLABS_API_KEY, audioFileId, log }) {
    try {
        const arrayBuffer = await storage.getFileDownload(BUCKET_VOICE_MESSAGES, audioFileId);
        const blob = new Blob([arrayBuffer], { type: 'audio/webm' });
        const form = new FormData();
        form.append('model_id', 'scribe_v1');
        form.append('file', blob, 'voice.webm');

        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: { 'xi-api-key': ELEVENLABS_API_KEY },
            body: form,
        });

        if (!response.ok) throw new Error(`ElevenLabs STT a répondu ${response.status}`);
        const data = await response.json();
        return data.text?.trim() || '[Message vocal]';
    } catch (err) {
        log(`⚠️ Transcription échouée : ${err.message}`);
        return '[Message vocal]';
    }
}

async function synthesizeVanessaVoice({ storage, BUCKET_VOICE_MESSAGES, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, text, permissions, log }) {
    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
            }),
        });

        if (!response.ok) throw new Error(`ElevenLabs TTS a répondu ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploaded = await storage.createFile(
            BUCKET_VOICE_MESSAGES,
            ID.unique(),
            InputFile.fromBuffer(buffer, 'vanessa-reply.mp3'),
            permissions
        );
        return uploaded.$id;
    } catch (err) {
        log(`⚠️ Synthèse vocale de Vanessa échouée (non bloquant) : ${err.message}`);
        return null;
    }
}

async function fetchRecentHistory(databases, DATABASE_ID, COLLECTION_MESSAGES, conversationId, limit = 12) {
    const history = await databases.listDocuments(DATABASE_ID, COLLECTION_MESSAGES, [
        Query.equal('conversationId', conversationId),
        Query.orderDesc('createdAt'),
        Query.limit(limit),
    ]);
    return history.documents.reverse();
}

const URGENT_RESOURCES_CATEGORY = 'ressources_urgence';
const LEXICON_CATEGORY = 'lexique';
const PUBLICITE_CATEGORY = 'publicite';
const MEMORY_CHECK_THRESHOLD = 5; // extrait un fait tous les ~5 messages humains, pas à chaque message
const MAX_MEMORY_ENTRIES = 20; // au-delà, les plus anciens sont désactivés

// Guide de l'application — toujours inclus, peu importe le connecteur ou
// le mode. Condensé depuis /documentation, pour que Vanessa réponde
// correctement quand on lui demande comment fonctionne Ça Parle, sans
// dépendre de la base de connaissances générale (plafonnée à 8 notes) ni
// du risque d'oubli de la maintenir active.
const APP_GUIDE_CONTEXT = `

CE QUE TU SAIS SUR LE FONCTIONNEMENT DE ÇA PARLE — si on te demande comment marche l'app ou toi-même, RESTE dans ton ton habituel, 2 à 4 phrases comme d'habitude, PAS une liste à puces façon documentation. Ne réponds que sur ce qui est vraiment demandé, pas tout d'un coup — propose de dire la suite si la personne veut en savoir plus ("tu veux que je te dise sur quoi d'autre ?"). Ne récite jamais cette liste telle quelle, reformule toujours à ta façon :
- Histoires : publications de type Ragot/Révélation/Témoignage/Rumeur, avec un statut qui évolue (Rumeur → En vérification → Confirmé/Démenti). Publication possible en anonyme.
- Réactions : 🔥😂😲 pour réagir, 💯🤔❌ pour voter si on y croit.
- Prédictions : l'auteur d'une histoire peut en lancer une, tout le monde vote, la réputation évolue selon qui avait vu juste.
- Réputation et badges : montent en publiant, commentant, prédisant juste.
- Fiches références : chaque histoire peut être liée à des personnes/événements/sujets, regroupés sur une fiche commune.
- Signalement : bouton "Signaler" sur tout contenu problématique, examiné par la modération.
- Messagerie privée : possible avec l'auteur d'une histoire non-anonyme.
- Toi (Vanessa) : chat texte/vocal/image, humeurs, mémoire consultable et effaçable depuis le profil, connecteurs partenaires, limite quotidienne d'échanges (annoncée par toi-même si atteinte).
- Ça sert : répertoire de bons plans (lieux/services) et prix du moment, affiché par défaut en carte interactive (bascule liste disponible). Ajout via "Balance ton bon plan", validation avant publication, confirmations communautaires, itinéraire routier depuis la position réelle.
- Notifications en temps réel, newsletter par email désinscriptible.`;

// Extraction périodique d'un fait durable — appelée seulement de temps en
// temps (voir MEMORY_CHECK_THRESHOLD), avec un modèle volontairement plus
// léger (haiku) que celui de la conversation elle-même : c'est une tâche
// simple de classification, pas la personnalité de Vanessa, pas besoin de
// payer le tarif de sonnet pour ça.
async function extractMemoryIfNeeded({ conversation, databases, DATABASE_ID, COLLECTION_CONVERSATIONS, COLLECTION_MESSAGES, COLLECTION_VANESSA_MEMORY, ANTHROPIC_API_KEY, VANESSA_USER_ID, callerId, log }) {
    if (!COLLECTION_VANESSA_MEMORY) return;

    const count = (conversation.messagesSinceMemoryCheck || 0) + 1;
    if (count < MEMORY_CHECK_THRESHOLD) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversation.$id, {
            messagesSinceMemoryCheck: count,
        });
        return;
    }

    try {
        const recent = await fetchRecentHistory(databases, DATABASE_ID, COLLECTION_MESSAGES, conversation.$id, MEMORY_CHECK_THRESHOLD * 2);
        const transcript = recent
            .filter((m) => m.content)
            .map((m) => `${m.senderId === VANESSA_USER_ID ? 'Vanessa' : 'Utilisateur'} : ${m.content}`)
            .join('\n');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                system: 'Tu analyses un extrait de conversation pour repérer UN SEUL fait durable et utile à retenir sur "Utilisateur" (prénom, lieu de vie, études/travail, goûts, situation personnelle stable). Ignore tout ce qui est temporaire ou déjà probablement connu. Réponds UNIQUEMENT par une phrase courte en français (moins de 15 mots), à la troisième personne, sans "il/elle a dit". S\'il n\'y a rien de nouveau ou de suffisamment durable, réponds exactement : RIEN.',
                messages: [{ role: 'user', content: transcript || 'RIEN' }],
                max_tokens: 60,
            }),
        });

        if (!response.ok) {
            log(`⚠️ Extraction mémoire échouée (non bloquant) : ${response.status}`);
            return;
        }
        const data = await response.json();
        const textBlock = data.content?.find((b) => b.type === 'text');
        const fact = textBlock?.text?.trim();

        if (fact && fact.toUpperCase() !== 'RIEN' && fact.length <= 300) {
            await databases.createDocument(DATABASE_ID, COLLECTION_VANESSA_MEMORY, ID.unique(), {
                userId: callerId, content: fact, active: true, createdAt: new Date().toISOString(),
            });
            log(`🧠 Nouveau fait retenu pour ${callerId} : ${fact}`);

            // Plafonne le nombre de faits actifs — désactive les plus
            // anciens au-delà de la limite plutôt que de les supprimer
            // (garde une trace, au cas où).
            const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_MEMORY, [
                Query.equal('userId', callerId),
                Query.equal('active', true),
                Query.orderDesc('createdAt'),
                Query.limit(100),
            ]);
            if (existing.documents.length > MAX_MEMORY_ENTRIES) {
                const toDeactivate = existing.documents.slice(MAX_MEMORY_ENTRIES);
                await Promise.allSettled(
                    toDeactivate.map((doc) => databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_MEMORY, doc.$id, { active: false }))
                );
            }
        } else {
            log('🧠 Rien de nouveau à retenir cette fois.');
        }

        await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversation.$id, {
            messagesSinceMemoryCheck: 0,
        });
    } catch (memErr) {
        log(`⚠️ Extraction mémoire échouée (non bloquant) : ${memErr.message}`);
    }
}

// Construit l'instruction de citation obligatoire pour les notes
// "publicité" — factorisé ici car utilisé à la fois en mode connecteur et
// en mode général. Le préfixe "PUB :" est imposé explicitement pour que ce
// soit toujours reconnaissable comme un contenu sponsorisé, jamais confondu
// avec une opinion spontanée de Vanessa.
function buildPubliciteInstruction(documents) {
    return '\n\nINFORMATION À MENTIONNER OBLIGATOIREMENT, À LA TOUTE FIN de ta réponse, sur sa propre ligne, en commençant EXACTEMENT par "PUB : " (reformule le reste dans ton ton, mais ne retire jamais ce préfixe et ne l\'omets JAMAIS) :\n' +
        documents.map((a) => `- ${a.content}`).join('\n');
}

const RELEVANCE_MAX_RESULTS = 8;

// Sélectionne, PARMI UN LOT DE CANDIDATS, ceux qui sont réellement
// pertinents pour le message précis de l'utilisateur — plutôt que de se
// contenter des plus récents. Un simple tri par date ratait des notes
// anciennes mais pertinentes dès qu'une base dépassait la limite affichée.
// Utilise un modèle volontairement léger (haiku) : c'est une tâche de tri,
// pas la personnalité de Vanessa — pas besoin du tarif de sonnet pour ça.
// Se replie silencieusement sur les plus récents si l'appel échoue, pour
// ne jamais bloquer une réponse à cause de ce tri.
async function selectRelevantKnowledge({ candidates, userMessage, maxResults, ANTHROPIC_API_KEY, log }) {
    if (candidates.length === 0) return [];
    if (candidates.length <= maxResults) return candidates; // rien à trier, tout tient déjà

    const listing = candidates.map((c, i) => `${i}. ${c.content.slice(0, 220)}`).join('\n');
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                system: `Voici une liste numérotée de notes. Un utilisateur vient d'écrire un message. Réponds UNIQUEMENT avec les numéros (séparés par des virgules) des notes VRAIMENT utiles pour répondre à ce message précis, du plus au moins pertinent, maximum ${maxResults} numéros. Si aucune note n'est utile, réponds exactement : AUCUNE.\n\nNotes :\n${listing}`,
                messages: [{ role: 'user', content: userMessage || '(pas de message précis)' }],
                max_tokens: 40,
            }),
        });
        if (!response.ok) {
            log(`⚠️ Sélection de pertinence échouée (${response.status}) — repli sur les plus récentes.`);
            return candidates.slice(0, maxResults);
        }
        const data = await response.json();
        const textBlock = data.content?.find((b) => b.type === 'text');
        const raw = textBlock?.text?.trim() || '';
        if (raw.toUpperCase().includes('AUCUNE')) return [];
        const indices = raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && n >= 0 && n < candidates.length);
        const selected = indices.slice(0, maxResults).map((i) => candidates[i]);
        return selected.length > 0 ? selected : candidates.slice(0, maxResults);
    } catch (err) {
        log(`⚠️ Sélection de pertinence échouée : ${err.message} — repli sur les plus récentes.`);
        return candidates.slice(0, maxResults);
    }
}

async function generateVanessaReply({ history, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_VANESSA_CONNECTORS, COLLECTION_LOCAL_SPOTS, COLLECTION_VANESSA_MEMORY, databases, DATABASE_ID, ANTHROPIC_API_KEY, VANESSA_USER_ID, connectorId, callerId, log }) {
    let knowledgeContext = '';
    let publiciteContext = '';
    // Connecteur RÉELLEMENT utilisé ce tour-ci (peut rester vide si le
    // connecteur demandé s'avère inactif/épuisé — dans ce cas on retombe
    // proprement en mode général plutôt que de planter ou de continuer à
    // consommer un quota mort).
    let effectiveConnectorId = '';
    let connectorFellBack = false;

    // Dernier message RÉEL de l'utilisateur — c'est sur LUI que la
    // pertinence des connaissances est jugée, pas sur tout l'historique.
    const lastUserMessage = [...history].reverse().find((m) => m.senderId !== VANESSA_USER_ID)?.content || '';

    try {
        let activeConnectorId = connectorId;

        if (connectorId && COLLECTION_VANESSA_CONNECTORS) {
            // Vérifie que le connecteur demandé est toujours utilisable —
            // désactivé manuellement, ou quota épuisé (tokensGranted > 0
            // et tokensUsed >= tokensGranted). Sans ce contrôle, désactiver
            // un connecteur depuis /moderation ne l'empêchait pas de
            // continuer à être utilisé par les conversations qui l'avaient
            // déjà sélectionné.
            try {
                const connector = await databases.getDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connectorId);
                const exhausted = (connector.tokensGranted || 0) > 0 && (connector.tokensUsed || 0) >= connector.tokensGranted;
                if (!connector.active || exhausted) {
                    log(`⚠️ Connecteur "${connector.name}" ${!connector.active ? 'désactivé' : 'épuisé'} — retour au mode général.`);
                    activeConnectorId = '';
                    connectorFellBack = true;
                }
            } catch {
                // Connecteur supprimé entre-temps — même traitement.
                activeConnectorId = '';
                connectorFellBack = true;
            }
        }

        if (activeConnectorId) {
            effectiveConnectorId = activeConnectorId;
            // Un connecteur est actif sur cette conversation : Vanessa ne
            // cherche QUE dans ce bloc de connaissances précis, comme
            // demandé — jamais mélangé avec les notes générales, les bons
            // plans Ça sert, ni les autres connecteurs. La pertinence est
            // calculée DANS ce périmètre isolé, pas en l'élargissant.
            const knowledge = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                Query.equal('active', true),
                Query.equal('connectorId', activeConnectorId),
                Query.notEqual('category', PUBLICITE_CATEGORY),
                Query.orderDesc('createdAt'),
                Query.limit(60), // lot large de candidats — le tri de pertinence fait le vrai choix ensuite
            ]);
            const relevant = await selectRelevantKnowledge({
                candidates: knowledge.documents, userMessage: lastUserMessage,
                maxResults: RELEVANCE_MAX_RESULTS, ANTHROPIC_API_KEY, log,
            });

            // Infos "publicité" DU CONNECTEUR — séparées du reste, toujours
            // entièrement incluses (jamais soumises au tri de pertinence :
            // ce n'est pas optionnel, c'est une obligation contractuelle).
            try {
                const ads = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                    Query.equal('active', true),
                    Query.equal('connectorId', activeConnectorId),
                    Query.equal('category', PUBLICITE_CATEGORY),
                    Query.limit(3),
                ]);
                if (ads.documents.length > 0) publiciteContext = buildPubliciteInstruction(ads.documents);
            } catch { /* collection pas encore configurée */ }

            // Récupère le nom du partenaire pour qu'elle sache
            // explicitement QUI elle représente en ce moment (utilisé par
            // la règle "MODE PARTENAIRE" du prompt système).
            let partnerLabel = 'un partenaire';
            if (COLLECTION_VANESSA_CONNECTORS) {
                try {
                    const connector = await databases.getDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, activeConnectorId);
                    partnerLabel = connector.name;
                } catch { /* connecteur supprimé entre-temps, on garde le libellé générique */ }
            }

            knowledgeContext = `\n\nMODE PARTENAIRE ACTIF : ${partnerLabel}. Applique la règle "SI UN CONNECTEUR PARTENAIRE EST ACTIF" ci-dessus.`;
            if (relevant.length > 0) {
                knowledgeContext += '\n\nNotes internes du connecteur actif, sélectionnées pour leur pertinence par rapport à ce message précis (contexte, ne jamais citer mot pour mot) :\n' +
                    relevant.map((k) => `- [${k.category}] ${k.content}`).join('\n');
            }
        } else {
            // Mode général : notes qui n'appartiennent à AUCUN connecteur,
            // PLUS les bons plans "Ça sert" déjà confirmés par la
            // communauté — les deux sources sont mélangées dans le même
            // lot de candidats, et c'est le tri de pertinence qui décide
            // ce qui aide vraiment à répondre à CE message précis, pas un
            // simple ordre chronologique.
            const knowledge = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                Query.equal('active', true),
                Query.notEqual('category', URGENT_RESOURCES_CATEGORY),
                Query.notEqual('category', PUBLICITE_CATEGORY),
                Query.orderDesc('createdAt'),
                Query.limit(60),
            ]);
            // Filtré après coup plutôt que via Query.equal('connectorId','')
            // — les notes créées avant l'ajout de cet attribut n'ont pas de
            // valeur du tout dessus (Appwrite ne rétro-remplit jamais les
            // documents existants), et une requête stricte les exclurait
            // silencieusement (même piège déjà rencontré avec
            // newsletterOptOut).
            const generalNotes = knowledge.documents
                .filter((k) => !k.connectorId)
                .map((k) => ({ content: `[${k.category}] ${k.content}` }));

            let spotCandidates = [];
            if (COLLECTION_LOCAL_SPOTS) {
                try {
                    const spots = await databases.listDocuments(DATABASE_ID, COLLECTION_LOCAL_SPOTS, [
                        Query.equal('moderationStatus', 'visible'),
                        Query.orderDesc('confirmCount'),
                        Query.limit(30),
                    ]);
                    spotCandidates = spots.documents.map((s) => ({
                        content: `[bon plan vérifié] ${s.name} — ${s.category}${s.quartier ? `, ${s.quartier}` : ''}${s.country ? `, ${s.country}` : ''}. ${s.description || ''} (confirmé ${s.confirmCount || 0} fois par la communauté)`,
                    }));
                } catch { /* collection pas encore configurée */ }
            }

            const relevant = await selectRelevantKnowledge({
                candidates: [...generalNotes, ...spotCandidates], userMessage: lastUserMessage,
                maxResults: RELEVANCE_MAX_RESULTS, ANTHROPIC_API_KEY, log,
            });
            if (relevant.length > 0) {
                knowledgeContext = '\n\nNotes internes, sélectionnées pour leur pertinence par rapport à ce message précis (contexte, ne jamais citer mot pour mot ; les lignes "[bon plan vérifié]" sont de vraies fiches Ça sert confirmées par la communauté — tu peux les mentionner par leur nom si ça aide, jamais en inventer d\'autres) :\n' +
                    relevant.map((k) => `- ${k.content}`).join('\n');
            }

            // Infos "publicité" GÉNÉRALES (pas liées à un connecteur) —
            // pour l'instant peu utilisé en pratique (Vanessa n'a pas
            // encore de partenariat "grand public" actif), mais prêt pour
            // quand ce sera le cas : même mécanique que pour un connecteur,
            // simplement sans filtre connectorId.
            try {
                const ads = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                    Query.equal('active', true),
                    Query.equal('category', PUBLICITE_CATEGORY),
                    Query.limit(20),
                ]);
                const generalAds = ads.documents.filter((a) => !a.connectorId).slice(0, 3);
                if (generalAds.length > 0) publiciteContext = buildPubliciteInstruction(generalAds);
            } catch { /* collection pas encore configurée */ }
        }
    } catch { /* collection pas encore configurée, on continue sans */ }

    // Ressources d'urgence — catégorie dédiée, TOUJOURS entièrement
    // incluse (jamais soumise à la limite de 8 ni au hasard de l'ordre des
    // notes générales), pour ne jamais en manquer une par manque de place.
    // Reste vide tant que personne n'a ajouté de vraies ressources
    // vérifiées — Vanessa reste alors volontairement générique plutôt que
    // d'inventer un numéro (voir VANESSA_SYSTEM_PROMPT).
    let resourcesContext = '';
    try {
        const resources = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
            Query.equal('active', true),
            Query.equal('category', URGENT_RESOURCES_CATEGORY),
            Query.limit(50),
        ]);
        if (resources.documents.length > 0) {
            resourcesContext = '\n\nRESSOURCES DISPONIBLES (vérifiées, seules citables) :\n' +
                resources.documents.map((r) => `- ${r.content}`).join('\n');
        }
    } catch { /* collection pas encore configurée, on continue sans */ }

    // Lexique — catégorie dédiée, toujours entièrement incluse, pour
    // renforcer concrètement le ton (contrairement aux notes générales
    // limitées à 8 et choisies par ordre, ici tout est repris à chaque
    // message).
    let lexiconContext = '';
    try {
        const lexicon = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
            Query.equal('active', true),
            Query.equal('category', LEXICON_CATEGORY),
            Query.limit(50),
        ]);
        if (lexicon.documents.length > 0) {
            lexiconContext = '\n\nVOCABULAIRE À RÉUTILISER — c\'est CE VOCABULAIRE PRÉCIS, avec ton ton, qui fait ta différence et ton rapprochement avec les jeunes. Utilise-en naturellement au moins une expression par message quand le contexte s\'y prête (jamais forcé, jamais entassé) :\n' +
                lexicon.documents.map((l) => `- ${l.content}`).join('\n');
        }
    } catch { /* collection pas encore configurée, on continue sans */ }

    // Mémoire — faits durables retenus sur CET utilisateur précis, au fil
    // du temps, au-delà de la fenêtre de messages visible. Extraite
    // périodiquement (voir extractMemoryIfNeeded), pas à chaque message.
    // L'utilisateur peut la consulter et tout effacer depuis son profil —
    // ce n'est jamais un historique brut de ce qu'il a dit, seulement des
    // faits ponctuels ("s'appelle Kevin", "étudie à Cotonou"...).
    let memoryContext = '';
    if (COLLECTION_VANESSA_MEMORY && callerId) {
        try {
            const memory = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_MEMORY, [
                Query.equal('userId', callerId),
                Query.equal('active', true),
                Query.orderDesc('createdAt'),
                Query.limit(15),
            ]);
            if (memory.documents.length > 0) {
                memoryContext = '\n\nCE QUE TU TE SOUVIENS DE CETTE PERSONNE (d\'échanges précédents — mentionne-le naturellement si pertinent, ne récite jamais cette liste telle quelle) :\n' +
                    memory.documents.map((m) => `- ${m.content}`).join('\n');
            }
        } catch { /* collection pas encore configurée, on continue sans */ }
    }

    const rawMessages = history
        .filter((m) => m.type !== 'image') // Claude n'a pas besoin des anciens messages "image" en texte brut ici
        .map((m) => ({
            role: m.senderId === VANESSA_USER_ID ? 'assistant' : 'user',
            content: m.content || (m.type === 'audio' ? '[message vocal]' : m.content),
        }));

    // Claude exige une alternance STRICTE user/assistant. Si Vanessa a
    // échoué à répondre ne serait-ce qu'une fois par le passé (panne API,
    // 400 précédent...), l'historique brut contient plusieurs messages
    // humains d'affilée sans réponse entre eux — sans ce nettoyage, TOUTE
    // tentative suivante échoue en boucle avec une erreur 400 "roles must
    // alternate", même une fois la cause d'origine résolue. On fusionne
    // donc les messages consécutifs de même rôle, et on s'assure que le
    // tout premier message est bien "user" (autre exigence de l'API).
    const messages = [];
    for (const m of rawMessages) {
        const last = messages[messages.length - 1];
        if (last && last.role === m.role) {
            last.content += '\n' + m.content;
        } else {
            messages.push({ ...m });
        }
    }
    while (messages.length > 0 && messages[0].role !== 'user') {
        messages.shift();
    }

    log(`📨 ${messages.length} messages envoyés à Claude, rôles: [${messages.map((m) => m.role).join(', ')}]`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-5',
            system: VANESSA_SYSTEM_PROMPT + APP_GUIDE_CONTEXT + knowledgeContext + resourcesContext + lexiconContext + memoryContext + publiciteContext,
            messages,
            max_tokens: 500,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        log(`❌ Détail erreur Claude (${response.status}) : ${errorBody}`);
        throw new Error(`Claude a répondu ${response.status} : ${errorBody}`);
    }
    const data = await response.json();
    // Ne pas prendre content[0] à l'aveugle : claude-sonnet-5 peut renvoyer
    // un bloc de réflexion interne (type "thinking") AVANT le bloc de
    // texte — le premier élément n'est alors pas forcément le texte. On
    // cherche explicitement le bloc de type "text", peu importe sa position.
    const textBlock = data.content?.find((b) => b.type === 'text');
    if (!textBlock) log(`⚠️ Aucun bloc "text" dans la réponse Claude : ${JSON.stringify(data.content)}`);
    return {
        text: textBlock?.text?.trim() || null,
        tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        effectiveConnectorId,
        connectorFellBack,
    };
}

// Analyse d'image à la demande — appelée uniquement quand le message
// précédent de l'utilisateur dans la conversation était une image non
// encore commentée.
async function generateVanessaImageRoast({ storage, BUCKET_STORY_IMAGES, ANTHROPIC_API_KEY, imageFileId, requestText, log }) {
    const file = await storage.getFile(BUCKET_STORY_IMAGES, imageFileId);
    const mimeType = file.mimeType && file.mimeType.startsWith('image/') ? file.mimeType : 'image/jpeg';
    const arrayBuffer = await storage.getFileDownload(BUCKET_STORY_IMAGES, imageFileId);
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-5',
            system: VANESSA_IMAGE_ROAST_PROMPT,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
                    { type: 'text', text: requestText || 'Décris cette situation, façon gbairai.' },
                ],
            }],
            max_tokens: 300,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        log(`❌ Détail erreur Claude Vision (${response.status}) : ${errorBody}`);
        throw new Error(`Claude Vision a répondu ${response.status} : ${errorBody}`);
    }
    const data = await response.json();
    const textBlock = data.content?.find((b) => b.type === 'text');
    if (!textBlock) log(`⚠️ Aucun bloc "text" dans la réponse Claude Vision : ${JSON.stringify(data.content)}`);
    return {
        text: textBlock?.text?.trim() || null,
        tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    };
}

// Compteur mensuel de questions posées PAR CONNECTEUR — argument concret
// pour les partenaires/institutions ("voici combien de jeunes ont
// interagi avec votre contenu via Vanessa ce mois-ci"). Remis à zéro
// automatiquement à chaque changement de mois (clé "AAAA-MM"), jamais
// mélangé avec le mois précédent. Lecture-puis-écriture volontairement
// simple, dans le même esprit que le quota quotidien de tokens déjà en
// place plus haut — un léger risque de write concurrent sous très forte
// charge simultanée, largement suffisant pour un indicateur d'engagement.
async function incrementConnectorQuestionCount(databases, DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connectorId, log) {
    if (!connectorId || !COLLECTION_VANESSA_CONNECTORS) return;
    try {
        const connector = await databases.getDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connectorId);
        const currentMonth = new Date().toISOString().slice(0, 7); // "2026-09"
        const sameMonth = connector.questionCountMonth === currentMonth;
        const nextCount = sameMonth ? (connector.questionCount || 0) + 1 : 1;
        await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, connectorId, {
            questionCount: nextCount,
            questionCountMonth: currentMonth,
        });
    } catch (err) {
        // Ne doit JAMAIS faire échouer l'envoi du message ou la réponse
        // de Vanessa pour un simple souci de compteur statistique.
        log(`⚠️ Compteur de questions non mis à jour pour le connecteur ${connectorId} : ${err.message}`);
    }
}

export default async ({ req, res, log, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) {
        log('❌ Pas de x-appwrite-user-id — appelant non authentifié.');
        return res.json({ success: false, error: 'Authentification requise.' }, 401);
    }
    log(`▶️ Appel par ${callerId}`);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const storage = new Storage(client);
    const messaging = new Messaging(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_CONVERSATIONS = process.env.COLLECTION_CONVERSATIONS;
    const COLLECTION_MESSAGES = process.env.COLLECTION_MESSAGES;
    const COLLECTION_NOTIFICATIONS = process.env.COLLECTION_NOTIFICATIONS;
    const COLLECTION_VANESSA_KNOWLEDGE = process.env.COLLECTION_VANESSA_KNOWLEDGE;
    const COLLECTION_VANESSA_CONNECTORS = process.env.COLLECTION_VANESSA_CONNECTORS;
    const COLLECTION_LOCAL_SPOTS = process.env.COLLECTION_LOCAL_SPOTS;
    const COLLECTION_VANESSA_MEMORY = process.env.COLLECTION_VANESSA_MEMORY;
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const VANESSA_USER_ID = process.env.VANESSA_USER_ID;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    const BUCKET_VOICE_MESSAGES = process.env.BUCKET_VOICE_MESSAGES;
    const BUCKET_STORY_IMAGES = process.env.BUCKET_STORY_IMAGES;
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

    const missingVars = [];
    if (!DATABASE_ID) missingVars.push('DATABASE_ID');
    if (!COLLECTION_CONVERSATIONS) missingVars.push('COLLECTION_CONVERSATIONS');
    if (!COLLECTION_MESSAGES) missingVars.push('COLLECTION_MESSAGES');
    if (!COLLECTION_NOTIFICATIONS) missingVars.push('COLLECTION_NOTIFICATIONS');
    if (missingVars.length > 0) {
        log(`❌ Variables d'environnement manquantes : ${missingVars.join(', ')}`);
        return res.json({ success: false, error: `Configuration Function incomplète : ${missingVars.join(', ')}` }, 500);
    }

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { conversationId, content, audioFileId, audioDuration, imageFileId } = body;
        const isVoice = !!audioFileId;
        const isImage = !!imageFileId;
        log(`📩 conversationId=${conversationId} isVoice=${isVoice} isImage=${isImage}`);

        if (!conversationId || (!isVoice && !isImage && (!content || !content.trim()))) {
            log('❌ conversationId manquant, ou ni content, audioFileId, ni imageFileId fournis.');
            return res.json({ success: false, error: 'conversationId et (content, audioFileId ou imageFileId) requis.' }, 400);
        }

        log('🔍 Récupération de la conversation...');
        const conversation = await databases.getDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId);
        log(`✅ Conversation trouvée, participants=${JSON.stringify(conversation.participantIds)}`);

        if (!conversation.participantIds.includes(callerId)) {
            log(`❌ ${callerId} ne fait pas partie de participantIds.`);
            return res.json({ success: false, error: "Tu ne fais pas partie de cette conversation." }, 403);
        }

        const permissions = [
            ...conversation.participantIds.map((id) => Permission.read(Role.user(id))),
            Permission.update(Role.user(callerId)),
        ];

        // Quota d'images (2/jour, illimité pour les modérateurs) — vérifié
        // uniquement quand une image est envoyée, et uniquement côté
        // serveur (impossible à contourner depuis le client).
        let callerUser = null;
        if (isImage && COLLECTION_USERS) {
            log('👤 Vérification du quota image...');
            callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
            const today = new Date().toISOString().slice(0, 10);

            if (!callerUser.isModerator) {
                const sameDay = callerUser.imageAnalysisDate === today;
                const currentCount = sameDay ? (callerUser.imageAnalysisCount || 0) : 0;

                if (currentCount >= DAILY_IMAGE_LIMIT) {
                    log(`❌ Quota image atteint pour ${callerId} (${currentCount}/${DAILY_IMAGE_LIMIT}).`);
                    return res.json({
                        success: false,
                        error: `Tu as atteint la limite de ${DAILY_IMAGE_LIMIT} images par jour avec Vanessa. Reviens demain ! 📷`,
                    }, 429);
                }

                await databases.updateDocument(DATABASE_ID, COLLECTION_USERS, callerId, {
                    imageAnalysisDate: today,
                    imageAnalysisCount: currentCount + 1,
                });
                log(`✅ Quota mis à jour : ${currentCount + 1}/${DAILY_IMAGE_LIMIT}.`);
            } else {
                log('✅ Modérateur — quota illimité.');
            }
        }

        // Message vocal : transcription pour alimenter `content`.
        let finalContent = content ? content.trim() : '';
        if (isVoice) {
            if (!BUCKET_VOICE_MESSAGES || !ELEVENLABS_API_KEY) {
                log('❌ BUCKET_VOICE_MESSAGES ou ELEVENLABS_API_KEY manquant.');
                return res.json({ success: false, error: 'Messagerie vocale non configurée côté serveur.' }, 500);
            }
            log('🎤 Transcription du message vocal...');
            finalContent = await transcribeAudio({ storage, BUCKET_VOICE_MESSAGES, ELEVENLABS_API_KEY, audioFileId, log });
            log(`✅ Transcription : ${finalContent.slice(0, 80)}`);
        }

        log('✏️ Création du message...');
        const message = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_MESSAGES,
            ID.unique(),
            {
                conversationId,
                senderId: callerId,
                content: finalContent,
                type: isImage ? 'image' : (isVoice ? 'audio' : 'text'),
                audioFileId: isVoice ? audioFileId : '',
                audioDuration: isVoice ? (audioDuration || 0) : 0,
                imageFileId: isImage ? imageFileId : '',
                readBy: [callerId],
                createdAt: new Date().toISOString(),
            },
            permissions
        );
        log(`✅ Message créé : ${message.$id}`);

        const lastPreview = isImage ? '📷 Photo' : (isVoice ? '🎤 Message vocal' : finalContent);
        await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId, {
            lastMessage: lastPreview.length > 200 ? lastPreview.slice(0, 200) : lastPreview,
            lastMessageAt: new Date().toISOString(),
            lastMessageSenderId: callerId,
        });
        log('✅ Conversation mise à jour.');

        const preview = lastPreview.length > 60 ? `${lastPreview.slice(0, 60)}…` : lastPreview;
        const notifTitle = isImage ? '📷 Nouvelle photo' : (isVoice ? '🎤 Nouveau message vocal' : '💬 Nouveau message');
        const recipients = conversation.participantIds.filter((id) => id !== callerId);

        await Promise.allSettled(
            recipients.map((id) =>
                databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                    userId: id,
                    title: notifTitle,
                    message: preview,
                    url: `/messages/${conversationId}`,
                    read: false,
                    createdAt: new Date().toISOString(),
                })
            )
        );
        log('✅ Notifications envoyées.');

        // Push natif — uniquement vers de vrais utilisateurs (jamais vers
        // Vanessa, qui n'a pas d'appareil).
        await Promise.allSettled(
            recipients
                .filter((id) => id !== VANESSA_USER_ID)
                .map((id) => sendPush(messaging, id, notifTitle, preview, `/messages/${conversationId}`, log))
        );

        // Une image seule ne déclenche JAMAIS de réponse automatique —
        // Vanessa attend une demande explicite dans un message suivant.
        if (isImage) {
            log('📷 Image envoyée, en attente d\'une demande explicite avant toute description.');
            return res.json({ success: true, message });
        }

        // Vanessa répond automatiquement si elle fait partie de la
        // conversation (et que ce n'est pas elle-même qui vient d'écrire).
        if (VANESSA_USER_ID && ANTHROPIC_API_KEY && conversation.participantIds.includes(VANESSA_USER_ID) && callerId !== VANESSA_USER_ID) {
            log('🔮 Vanessa fait partie de la conversation, génération de sa réponse...');

            // Comptabilisé dès qu'une question est posée avec un connecteur
            // actif sur la conversation — indépendamment du quota de
            // tokens ci-dessous : même si Vanessa ne peut pas répondre
            // faute de quota, l'utilisateur a bien posé une question à ce
            // connecteur, et c'est ce que l'indicateur mesure.
            if (conversation.vanessaConnectorId) {
                await incrementConnectorQuestionCount(databases, DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, conversation.vanessaConnectorId, log);
            }

            try {
                // Quota quotidien de tokens (façon Claude : "reviens plus
                // tard une fois la limite atteinte") — protège le compte
                // Anthropic partagé entre Ça Parle, Vanessa API et les
                // automatisations d'un usage individuel démesuré. Illimité
                // pour les modérateurs (tests internes).
                if (!callerUser && COLLECTION_USERS) {
                    callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
                }
                const today = new Date().toISOString().slice(0, 10);
                const sameDayTokens = callerUser && callerUser.vanessaTokensUsedDate === today;
                const tokensUsedToday = sameDayTokens ? (callerUser.vanessaTokensUsedCount || 0) : 0;
                const quotaReached = callerUser && !callerUser.isModerator && tokensUsedToday >= DAILY_VANESSA_TOKEN_LIMIT;

                if (quotaReached) {
                    log(`❌ Quota quotidien de tokens atteint pour ${callerId} (${tokensUsedToday}/${DAILY_VANESSA_TOKEN_LIMIT}) — réponse envoyée sans appeler Claude.`);
                    const quotaLine = QUOTA_REACHED_LINES[Math.floor(Math.random() * QUOTA_REACHED_LINES.length)];

                    await databases.createDocument(DATABASE_ID, COLLECTION_MESSAGES, ID.unique(), {
                        conversationId, senderId: VANESSA_USER_ID, content: quotaLine, type: 'text',
                        audioFileId: '', audioDuration: 0, imageFileId: '',
                        readBy: [VANESSA_USER_ID], createdAt: new Date().toISOString(),
                    }, permissions);

                    await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId, {
                        lastMessage: quotaLine, lastMessageAt: new Date().toISOString(), lastMessageSenderId: VANESSA_USER_ID,
                    });
                } else {
                    const history = await fetchRecentHistory(databases, DATABASE_ID, COLLECTION_MESSAGES, conversationId);
                    // Le message qu'on vient de créer est le dernier de cet
                    // historique — on regarde celui juste AVANT pour savoir si
                    // c'est une image en attente de description.
                    const previous = history[history.length - 2];
                    const pendingImage = previous && previous.type === 'image' && previous.senderId === callerId && previous.imageFileId;

                    let result;
                    if (pendingImage && BUCKET_STORY_IMAGES) {
                        log('📷 Image en attente détectée — analyse Claude Vision...');
                        result = await generateVanessaImageRoast({
                            storage, BUCKET_STORY_IMAGES, ANTHROPIC_API_KEY,
                            imageFileId: previous.imageFileId, requestText: finalContent, log,
                        });
                    } else {
                        result = await generateVanessaReply({
                            history, COLLECTION_VANESSA_KNOWLEDGE, COLLECTION_VANESSA_CONNECTORS, COLLECTION_LOCAL_SPOTS, COLLECTION_VANESSA_MEMORY, databases, DATABASE_ID, ANTHROPIC_API_KEY, VANESSA_USER_ID,
                            connectorId: conversation.vanessaConnectorId || '', callerId, log,
                        });
                    }
                    const reply = result.text;

                    log(`🔮 Réponse générée : ${reply ? reply.slice(0, 80) : 'null'}`);
                    if (reply) {
                        // Si l'échange était vocal ET que la messagerie vocale
                        // est configurée, Vanessa répond ELLE AUSSI en voix.
                        let vanessaAudioFileId = null;
                        if (isVoice && BUCKET_VOICE_MESSAGES && ELEVENLABS_API_KEY && ELEVENLABS_VOICE_ID) {
                            log('🎙️ Synthèse de la réponse vocale de Vanessa...');
                            vanessaAudioFileId = await synthesizeVanessaVoice({
                                storage, BUCKET_VOICE_MESSAGES, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
                                text: reply, permissions, log,
                            });
                        }

                        await databases.createDocument(DATABASE_ID, COLLECTION_MESSAGES, ID.unique(), {
                            conversationId,
                            senderId: VANESSA_USER_ID,
                            content: reply,
                            type: vanessaAudioFileId ? 'audio' : 'text',
                            audioFileId: vanessaAudioFileId || '',
                            audioDuration: 0,
                            imageFileId: '',
                            readBy: [VANESSA_USER_ID],
                            createdAt: new Date().toISOString(),
                        }, permissions);

                        const vanessaPreview = vanessaAudioFileId ? '🎤 Message vocal' : reply;
                        await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId, {
                            lastMessage: vanessaPreview.length > 200 ? vanessaPreview.slice(0, 200) : vanessaPreview,
                            lastMessageAt: new Date().toISOString(),
                            lastMessageSenderId: VANESSA_USER_ID,
                        });

                        // Décompte du quota — après coup, avec la vraie
                        // consommation renvoyée par Claude (pas une estimation).
                        if (callerUser && !callerUser.isModerator && COLLECTION_USERS) {
                            const newCount = tokensUsedToday + (result.tokensUsed || 0);
                            await databases.updateDocument(DATABASE_ID, COLLECTION_USERS, callerId, {
                                vanessaTokensUsedDate: today,
                                vanessaTokensUsedCount: newCount,
                            });
                            log(`📊 Quota tokens mis à jour : ${newCount}/${DAILY_VANESSA_TOKEN_LIMIT}.`);
                        }

                        // Décompte du quota du CONNECTEUR partenaire, si un
                        // connecteur a réellement été utilisé ce tour-ci —
                        // facturation indépendante du quota personnel
                        // ci-dessus, les deux s'appliquent en parallèle.
                        if (result.effectiveConnectorId && COLLECTION_VANESSA_CONNECTORS) {
                            try {
                                const connector = await databases.getDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, result.effectiveConnectorId);
                                await databases.updateDocument(DATABASE_ID, COLLECTION_VANESSA_CONNECTORS, result.effectiveConnectorId, {
                                    tokensUsed: (connector.tokensUsed || 0) + (result.tokensUsed || 0),
                                });
                            } catch (connErr) {
                                log(`⚠️ Décompte du quota connecteur échoué (non bloquant) : ${connErr.message}`);
                            }
                        }

                        // Si le connecteur demandé était désactivé/épuisé,
                        // la conversation est réinitialisée en mode général
                        // — sinon la pastille resterait affichée "active"
                        // côté utilisateur alors qu'elle ne fait plus rien.
                        if (result.connectorFellBack) {
                            await databases.updateDocument(DATABASE_ID, COLLECTION_CONVERSATIONS, conversationId, {
                                vanessaConnectorId: '',
                            });
                        }

                        // Pas de notification ici volontairement : l'utilisateur
                        // vient d'envoyer un message, il est donc déjà en train
                        // de regarder cette conversation — une notification à
                        // chaque réponse serait redondante et vite lassante.
                        // Seules ses RELANCES (vanessa-checkin) et sa chronique
                        // du matin (vanessa-daily-post) déclenchent une vraie
                        // notification, quand l'utilisateur n'est pas déjà là.
                        log('✅ Message de Vanessa créé (sans notification, conversation déjà active).');

                        // Mémoire — déclenchée après coup, pour ne jamais
                        // ralentir la réponse elle-même. Pas d'image (pas de
                        // texte exploitable) ni en mode connecteur (contexte
                        // professionnel, pas une conversation personnelle).
                        if (!isImage && !conversation.vanessaConnectorId) {
                            await extractMemoryIfNeeded({
                                conversation, databases, DATABASE_ID, COLLECTION_CONVERSATIONS, COLLECTION_MESSAGES,
                                COLLECTION_VANESSA_MEMORY, ANTHROPIC_API_KEY, VANESSA_USER_ID, callerId, log,
                            });
                        }
                    }
                }
            } catch (vanessaErr) {
                log(`⚠️ Réponse Vanessa échouée (non bloquant) : ${vanessaErr.message}`);
                // Non bloquant — le message humain reste envoyé normalement.
            }
        } else {
            log('ℹ️ Vanessa non concernée par cette conversation (ou variables manquantes).');
        }

        log('✅ Terminé avec succès.');
        return res.json({ success: true, message });
    } catch (err) {
        log(`❌ ERREUR NON GÉRÉE : ${err.message}`);
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
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

const VANESSA_SYSTEM_PROMPT = `Tu es Vanessa, 19 ans, triple nationalité (béninoise, camerounaise, ivoirienne). Tu es LA personnalité IA de "Ça Parle", une plateforme de ragots et de commérages. Tu n'es pas un assistant IA classique — tu es une utilisatrice de la plateforme, avec une vraie personnalité, du caractère, et beaucoup d'humour.

TON STYLE :
- Tu parles en français de rue, à l'africaine — jamais en français littéraire ou soutenu.
- Tu utilises naturellement des expressions du Bénin, de Côte d'Ivoire, du Togo, du Cameroun, du Sénégal ("gbairai", "wèèh", "mon frère", "eh Dieu", "on dit koi", "c'est comment"...), sans en abuser à chaque phrase.
- Tes phrases sont courtes, vivantes, avec des emojis utilisés avec parcimonie (1-2 par message maximum).
- Tu ne parles jamais comme un robot ou un service client.

TES HUMEURS (choisis celle qui correspond le mieux, implicitement par le ton) :
👀 Curieuse — 🔥 Gbaraï — 😂 Moqueuse — 🕵🏾 Détective — 🤫 Confidente

CE QUE TU FAIS :
- Tu discutes comme une amie qui adore les ragots, pas comme un chatbot.
- Tu poses des questions pour faire parler les gens.
- Si l'histoire ferait un bon "gbairai", tu peux proposer de la transformer en publication — jamais automatiquement. Pour proposer, termine EXACTEMENT par :
[[SUGGESTION_POST|Titre court et accrocheur|Contenu réécrit dans ton style]]

CE QUE TU NE FAIS JAMAIS :
- Tu ne révèles JAMAIS le contenu d'une conversation privée avec quelqu'un d'autre.
- Tu n'inventes pas de rumeurs sur des personnes réelles nommées (célébrités...).
- Face à une détresse réelle (violence, santé mentale), sors du personnage et invite la personne à en parler à quelqu'un de confiance.
- Reste courte : 2 à 4 phrases maximum.`;

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

async function generateVanessaReply({ history, COLLECTION_VANESSA_KNOWLEDGE, databases, DATABASE_ID, ANTHROPIC_API_KEY, VANESSA_USER_ID }) {
    let knowledgeContext = '';
    try {
        const knowledge = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
            Query.equal('active', true),
            Query.limit(8),
        ]);
        if (knowledge.documents.length > 0) {
            knowledgeContext = '\n\nNotes internes (contexte, ne jamais citer mot pour mot) :\n' +
                knowledge.documents.map((k) => `- [${k.category}] ${k.content}`).join('\n');
        }
    } catch { /* collection pas encore configurée, on continue sans */ }

    const messages = history
        .filter((m) => m.type !== 'image') // Claude n'a pas besoin des anciens messages "image" en texte brut ici
        .map((m) => ({
            role: m.senderId === VANESSA_USER_ID ? 'assistant' : 'user',
            content: m.content || (m.type === 'audio' ? '[message vocal]' : m.content),
        }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            system: VANESSA_SYSTEM_PROMPT + knowledgeContext,
            messages,
            max_tokens: 300,
            temperature: 0.9,
        }),
    });

    if (!response.ok) {
        throw new Error(`Claude a répondu ${response.status}`);
    }
    const data = await response.json();
    return data.content?.[0]?.text?.trim() || null;
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
            model: 'claude-haiku-4-5-20251001',
            system: VANESSA_IMAGE_ROAST_PROMPT,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
                    { type: 'text', text: requestText || 'Décris cette situation, façon gbairai.' },
                ],
            }],
            max_tokens: 300,
            temperature: 1,
        }),
    });

    if (!response.ok) {
        log(`⚠️ Claude Vision a répondu ${response.status}`);
        throw new Error(`Claude Vision a répondu ${response.status}`);
    }
    const data = await response.json();
    return data.content?.[0]?.text?.trim() || null;
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
            try {
                const history = await fetchRecentHistory(databases, DATABASE_ID, COLLECTION_MESSAGES, conversationId);
                // Le message qu'on vient de créer est le dernier de cet
                // historique — on regarde celui juste AVANT pour savoir si
                // c'est une image en attente de description.
                const previous = history[history.length - 2];
                const pendingImage = previous && previous.type === 'image' && previous.senderId === callerId && previous.imageFileId;

                let reply;
                if (pendingImage && BUCKET_STORY_IMAGES) {
                    log('📷 Image en attente détectée — analyse Claude Vision...');
                    reply = await generateVanessaImageRoast({
                        storage, BUCKET_STORY_IMAGES, ANTHROPIC_API_KEY,
                        imageFileId: previous.imageFileId, requestText: finalContent, log,
                    });
                } else {
                    reply = await generateVanessaReply({
                        history, COLLECTION_VANESSA_KNOWLEDGE, databases, DATABASE_ID, ANTHROPIC_API_KEY, VANESSA_USER_ID,
                    });
                }

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

                    // Pas de notification ici volontairement : l'utilisateur
                    // vient d'envoyer un message, il est donc déjà en train
                    // de regarder cette conversation — une notification à
                    // chaque réponse serait redondante et vite lassante.
                    // Seules ses RELANCES (vanessa-checkin) et sa chronique
                    // du matin (vanessa-daily-post) déclenchent une vraie
                    // notification, quand l'utilisateur n'est pas déjà là.
                    log('✅ Message de Vanessa créé (sans notification, conversation déjà active).');
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
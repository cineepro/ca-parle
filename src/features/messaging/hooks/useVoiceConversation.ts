// src/features/messaging/hooks/useVoiceConversation.ts — Vanessa
// Mode "appel" : discussion vocale continue avec Vanessa, sans bouton à
// presser entre deux phrases (la personne parle → une pause → Vanessa répond
// à voix haute → l'écoute reprend toute seule).
//
// Même principe que l'écran d'enregistrement d'émission, mais pensé pour le
// chat de tous les jours :
//  - il ne rejoue JAMAIS l'historique : seules les réponses arrivées après le
//    début de l'appel sont lues ;
//  - il ne réagit qu'aux réponses à CE que la personne vient de dire (pas aux
//    messages spontanés de Vanessa) ;
//  - si la réponse arrive sans voix (limite du jour atteinte, voix
//    indisponible), il le signale et laisse l'écoute reprendre au lieu
//    d'attendre dans le vide ;
//  - il débloque la lecture audio au moment du clic (indispensable sur
//    iPhone/Safari), et laisse un court délai avant de réécouter pour ne pas
//    capter l'écho de la voix de Vanessa.
// Tout passe par le pipeline d'envoi vocal existant : chaque échange reste
// dans la conversation, réécoutable comme n'importe quel vocal.
import { useState, useRef, useCallback, useEffect } from 'react';
import { getVoiceMessageUrl, type Message } from '../services/messageService';

// --- Réglages (mêmes valeurs que l'émission, éprouvées au tournage) ---
const SILENCE_THRESHOLD = 12; // 0-255 — au-dessus : "quelqu'un parle"
const SILENCE_DURATION_MS = 1800; // pause jugée comme "fin du tour de parole"
const MIN_SPEECH_MS = 400; // en dessous : probablement un bruit
const MAX_TURN_MS = 45_000; // filet de sécurité si personne ne fait jamais de pause
const REPLY_TIMEOUT_MS = 30_000; // au-delà, on considère que la réponse ne viendra pas
const LISTEN_DELAY_AFTER_REPLY_MS = 400; // laisse mourir l'écho avant de réécouter
// Silence de 0 s, pour "débloquer" la lecture audio pendant le geste de l'utilisateur.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

// Préfixe unique dans la console F12 : tape "APPEL" dans le filtre.
const LOG = (...args: unknown[]) => console.log('[APPEL]', ...args);

export type VoicePhase = 'off' | 'paused' | 'listening' | 'recording' | 'processing' | 'speaking';
export type VoiceNotice = 'timeout' | 'text-reply' | null;

interface Options {
    messages: Message[];
    sendVoiceMessage: (blob: Blob, durationSeconds: number) => Promise<unknown> | void;
    vanessaUserId: string;
}

function newestVanessaMessage(list: Message[], vanessaId: string): Message | undefined {
    return [...list].reverse().find((m) => m.senderId === vanessaId);
}

export function useVoiceConversation({ messages, sendVoiceMessage, vanessaUserId }: Options) {
    const [phase, setPhase] = useState<VoicePhase>('off');
    const [micError, setMicError] = useState<string | null>(null);
    const [notice, setNotice] = useState<VoiceNotice>(null);

    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const turnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const listenDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const speechStartRef = useRef<number | null>(null);
    const silenceStartRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const awaitingRef = useRef(false);
    const lastHandledVanessaId = useRef<string | null>(null);

    // Toujours la version la plus fraîche de ces valeurs, quel que soit le
    // moment où une fonction a été créée — sans ça, une fonction figée par un
    // ancien rendu se tait ou lit une conversation périmée (bug rencontré et
    // corrigé sur l'écran d'émission).
    const messagesRef = useRef(messages); messagesRef.current = messages;
    const sendRef = useRef(sendVoiceMessage); sendRef.current = sendVoiceMessage;
    const vanessaIdRef = useRef(vanessaUserId); vanessaIdRef.current = vanessaUserId;
    const phaseRef = useRef<VoicePhase>('off'); phaseRef.current = phase;

    const beginTurnRef = useRef<() => void>(() => {});
    const endTurnRef = useRef<() => Promise<void>>(async () => {});
    const checkVolumeRef = useRef<() => void>(() => {});
    const playReplyRef = useRef<(fileId: string) => void>(() => {});

    const clearVad = useCallback(() => {
        if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
        if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
        vadIntervalRef.current = null;
        turnTimeoutRef.current = null;
    }, []);
    const clearReplyTimeout = useCallback(() => {
        if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
        replyTimeoutRef.current = null;
    }, []);
    const clearListenDelay = useCallback(() => {
        if (listenDelayRef.current) clearTimeout(listenDelayRef.current);
        listenDelayRef.current = null;
    }, []);

    // Reprend l'écoute après une réponse, avec un court délai anti-écho.
    const resumeAfterReply = () => {
        clearListenDelay();
        listenDelayRef.current = setTimeout(() => {
            if (streamRef.current && (phaseRef.current === 'speaking' || phaseRef.current === 'processing')) {
                beginTurnRef.current();
            }
        }, LISTEN_DELAY_AFTER_REPLY_MS);
    };

    beginTurnRef.current = () => {
        if (!streamRef.current) return;
        clearListenDelay();
        LOG('Nouveau tour — écoute démarrée.');
        const recorder = new MediaRecorder(streamRef.current);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.start();
        recorderRef.current = recorder;
        speechStartRef.current = null;
        silenceStartRef.current = null;
        setPhase('listening');
        vadIntervalRef.current = setInterval(() => checkVolumeRef.current(), 100);
        turnTimeoutRef.current = setTimeout(() => endTurnRef.current(), MAX_TURN_MS);
    };

    endTurnRef.current = async () => {
        clearVad();
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') return;
        LOG('Fin du tour détectée (silence).');
        setPhase('processing');
        const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
        recorder.stop();
        await stopped;

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const durationSeconds = Math.max(1, Math.round((speechStartRef.current ? Date.now() - speechStartRef.current : 1000) / 1000));
        LOG(`Blob capturé : ${blob.size} octets.`);

        if (blob.size === 0) {
            if (streamRef.current && phaseRef.current === 'processing') beginTurnRef.current();
            return;
        }

        // AVANT l'envoi : la réponse de Vanessa peut arriver dans la
        // conversation avant même que l'envoi ne "rende la main".
        awaitingRef.current = true;
        LOG('Envoi du vocal à Vanessa...');
        await sendRef.current(blob, durationSeconds);
        if (!awaitingRef.current) return; // sa réponse est déjà arrivée et traitée

        clearReplyTimeout();
        replyTimeoutRef.current = setTimeout(() => {
            if (awaitingRef.current && streamRef.current) {
                LOG(`⚠️ Aucune réponse après ${REPLY_TIMEOUT_MS / 1000}s — reprise de l'écoute.`);
                awaitingRef.current = false;
                setNotice('timeout');
                beginTurnRef.current();
            }
        }, REPLY_TIMEOUT_MS);
    };

    checkVolumeRef.current = () => {
        const analyser = analyserRef.current;
        if (!analyser) return;
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);
        const level = sum / data.length;

        const now = Date.now();
        if (level > SILENCE_THRESHOLD) {
            if (!speechStartRef.current) {
                speechStartRef.current = now;
                LOG(`Voix détectée (niveau ${level.toFixed(1)}).`);
                setPhase('recording');
            }
            silenceStartRef.current = null;
        } else if (speechStartRef.current) {
            if (!silenceStartRef.current) silenceStartRef.current = now;
            if (now - silenceStartRef.current > SILENCE_DURATION_MS && now - speechStartRef.current > MIN_SPEECH_MS) {
                endTurnRef.current();
            }
        }
    };

    // Lecture de la réponse : on attend que le navigateur ait assez chargé
    // l'audio avant de le jouer (une lecture en streaming saute au moindre
    // ralentissement du réseau), avec un filet si l'annonce ne vient jamais.
    playReplyRef.current = (fileId: string) => {
        const audio = audioRef.current ?? (audioRef.current = new Audio());
        setPhase('speaking');
        setNotice(null);
        let started = false;
        let fallback: ReturnType<typeof setTimeout> | null = null;
        const startPlayback = () => {
            if (started) return;
            started = true;
            if (fallback) clearTimeout(fallback);
            if (phaseRef.current === 'off' || phaseRef.current === 'paused') return;
            LOG('Lecture démarrée.');
            audio.play().catch((err) => {
                LOG('❌ Échec de lecture audio :', err);
                resumeAfterReply();
            });
        };
        audio.oncanplaythrough = startPlayback;
        fallback = setTimeout(() => { LOG('⚠️ Chargement lent — lecture lancée quand même.'); startPlayback(); }, 4000);
        audio.onwaiting = () => LOG('⚠️ Lecture en attente de données (réseau).');
        audio.onerror = () => { LOG('❌ Erreur de chargement audio.'); if (fallback) clearTimeout(fallback); resumeAfterReply(); };
        audio.onended = () => { LOG('Lecture terminée.'); resumeAfterReply(); };
        LOG('Chargement de la réponse audio...');
        audio.src = getVoiceMessageUrl(fileId);
        audio.load();
    };

    // Dès qu'une réponse à ce que la personne vient de dire apparaît dans la
    // conversation : on la lit, ou on signale qu'elle est venue sans voix.
    useEffect(() => {
        if (!awaitingRef.current || phase !== 'processing') return;
        const latest = newestVanessaMessage(messages, vanessaIdRef.current);
        if (!latest || latest.$id === lastHandledVanessaId.current) return;
        lastHandledVanessaId.current = latest.$id;
        awaitingRef.current = false;
        clearReplyTimeout();
        clearVad();
        if (!latest.audioFileId) {
            LOG('Réponse sans voix (limite du jour atteinte ou voix indisponible) — reprise de l\u2019écoute.');
            setNotice('text-reply');
            resumeAfterReply();
            return;
        }
        LOG('Réponse vocale de Vanessa détectée.');
        playReplyRef.current(latest.audioFileId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, phase]);

    const stop = useCallback(() => {
        if (phaseRef.current === 'off' && !streamRef.current) return;
        LOG('Fin de l\u2019appel.');
        awaitingRef.current = false;
        setPhase('off');
        clearVad();
        clearReplyTimeout();
        clearListenDelay();
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.onstop = null;
            recorderRef.current.stop();
        }
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.oncanplaythrough = null; audio.onended = null; audio.onerror = null; audio.onwaiting = null;
        }
        streamRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
    }, [clearVad, clearReplyTimeout, clearListenDelay]);

    // Coupe seulement l'ÉCOUTE : rien n'est envoyé, le tour en cours est
    // abandonné, le micro reste ouvert (reprise instantanée, sans nouvelle
    // autorisation).
    const pause = useCallback(() => {
        if (phaseRef.current === 'off') return;
        LOG('Pause.');
        awaitingRef.current = false;
        clearVad();
        clearReplyTimeout();
        clearListenDelay();
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.onstop = null;
            recorderRef.current.stop();
        }
        if (audioRef.current) audioRef.current.pause();
        setPhase('paused');
    }, [clearVad, clearReplyTimeout, clearListenDelay]);

    const resume = useCallback(() => {
        if (streamRef.current && phaseRef.current === 'paused') {
            LOG('Reprise après pause.');
            setNotice(null);
            beginTurnRef.current();
        }
    }, []);

    const start = useCallback(async () => {
        if (phaseRef.current !== 'off') return;
        setMicError(null);
        setNotice(null);
        // Débloque la lecture audio tant que le geste de l'utilisateur est
        // encore valide — sans ça, iPhone/Safari refuse de jouer la réponse
        // de Vanessa qui arrive plus tard, en dehors de tout clic.
        const audio = audioRef.current ?? (audioRef.current = new Audio());
        try { audio.src = SILENT_WAV; void audio.play().catch(() => {}); } catch { /* sans importance */ }
        try {
            LOG('Démarrage — demande d\u2019accès au micro...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            streamRef.current = stream;
            const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new Ctx();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            analyserRef.current = analyser;
            // Ne jamais rejouer l'historique : seules comptent les réponses
            // arrivées APRÈS le début de l'appel.
            lastHandledVanessaId.current = newestVanessaMessage(messagesRef.current, vanessaIdRef.current)?.$id ?? null;
            awaitingRef.current = false;
            LOG('Micro prêt.');
            beginTurnRef.current();
        } catch (err) {
            LOG('❌ Échec d\u2019accès au micro :', err);
            setMicError("Impossible d'accéder au micro — vérifie l'autorisation dans ton navigateur.");
        }
    }, []);

    return { phase, active: phase !== 'off', micError, notice, start, stop, pause, resume };
}
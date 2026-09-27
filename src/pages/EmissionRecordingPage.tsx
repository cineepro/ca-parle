// src/pages/EmissionRecordingPage.tsx — Vanessa
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useConversationThread } from '@/features/messaging/hooks/useConversationThread';
import { getVoiceMessageUrl } from '@/features/messaging/services/messageService';
import { VANESSA_USER_ID } from '@/api/constants';

// --- Réglages de la détection de silence (écoute continue) ---
// Volontairement isolés ici, en toutes lettres : ce sont des valeurs de
// départ raisonnables, mais un micro, une pièce, une distance différente —
// un vrai réglage fin ne se fait qu'en conditions réelles de tournage, pas
// en théorie. Ajuste-les après un nouvel essai si besoin.
const SILENCE_THRESHOLD = 12; // 0-255 — au-dessus : "quelqu'un parle"
const SILENCE_DURATION_MS = 1800; // pause jugée comme "fin du tour de parole" (assoupli : 1,3s coupait de vraies respirations de réflexion)
const MIN_SPEECH_MS = 400; // en dessous : probablement un bruit, pas une vraie phrase
const MAX_TURN_MS = 45_000; // filet de sécurité si personne ne fait jamais de pause
// Si la réponse de Vanessa n'arrive vraiment pas (échec silencieux côté
// serveur, quota, etc.), on ne reste pas bloqué en "Réfléchit..." pour
// toujours — on relance l'écoute après ce délai.
const REPLY_TIMEOUT_MS = 25_000;

type Phase = 'off' | 'paused' | 'listening' | 'recording' | 'processing' | 'speaking';

const PHASE_LABEL: Record<Phase, string> = {
    off: 'Émission à l\u2019arrêt',
    paused: 'En pause',
    listening: 'À l\u2019écoute',
    recording: 'Enregistre...',
    processing: 'Réfléchit...',
    speaking: 'Vanessa parle',
};
const PHASE_COLOR: Record<Phase, string> = {
    off: 'bg-gray-300',
    paused: 'bg-gray-400',
    listening: 'bg-blue-400',
    recording: 'bg-red-500',
    processing: 'bg-amber-400',
    speaking: 'bg-[#FF4757]',
};

export default function EmissionRecordingPage() {
    const { id } = useParams<{ id: string }>();
    const { conversation, messages, sendVoiceMessage, loading, sendError } = useConversationThread(id!);

    const [phase, setPhase] = useState<Phase>('off');
    const [micError, setMicError] = useState<string | null>(null);
    const [replyTimedOut, setReplyTimedOut] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const turnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const speechStartRef = useRef<number | null>(null);
    const silenceStartRef = useRef<number | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const lastPlayedMessageId = useRef<string | null>(null);
    const phaseRef = useRef<Phase>('off');
    phaseRef.current = phase;

    const clearVad = () => {
        if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
        if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
        vadIntervalRef.current = null;
        turnTimeoutRef.current = null;
    };
    const clearReplyTimeout = () => {
        if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
        replyTimeoutRef.current = null;
    };

    // Démarre un nouveau tour de parole : un enregistreur frais, une
    // détection de silence fraîche — appelé au démarrage de l'émission, à
    // la reprise après pause, ET après chaque réponse de Vanessa.
    const beginTurn = useCallback(() => {
        if (!streamRef.current) return;
        const recorder = new MediaRecorder(streamRef.current);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.start();
        recorderRef.current = recorder;
        speechStartRef.current = null;
        silenceStartRef.current = null;
        setPhase('listening');
        vadIntervalRef.current = setInterval(checkVolume, 100);
        turnTimeoutRef.current = setTimeout(endTurn, MAX_TURN_MS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Termine le tour de parole en cours : arrête l'enregistrement de CE
    // tour précis, envoie le vocal capturé par le pipeline déjà existant.
    //
    // IMPORTANT : l'envoi (sendVoiceMessage) confirme seulement que TON
    // message est bien enregistré — la vraie réponse de Vanessa arrive
    // séparément, un peu après, via la conversation elle-même. On reste
    // donc bien en "Réfléchit..." après cet envoi, et c'est l'effet plus
    // bas (qui surveille l'arrivée d'un nouveau message vocal d'elle) qui
    // fait vraiment avancer vers "Vanessa parle" — jamais cette fonction.
    const endTurn = useCallback(async () => {
        clearVad();
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') return;
        setPhase('processing');
        const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
        recorder.stop();
        await stopped;

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const durationSeconds = Math.max(1, Math.round(((speechStartRef.current ? Date.now() - speechStartRef.current : 1000)) / 1000));

        if (blob.size === 0) {
            // Rien capturé de valable — inutile d'attendre une réponse
            // qui ne viendra jamais, on relance directement l'écoute.
            if (streamRef.current) beginTurn();
            return;
        }

        await sendVoiceMessage(blob, durationSeconds);
        // À partir d'ici, on reste en "processing" — voir le commentaire
        // au-dessus. Un filet de sécurité si sa réponse ne vient vraiment
        // jamais (panne, quota...), pour ne jamais rester bloqué — mais on
        // le SIGNALE cette fois, plutôt que de revenir en bleu sans rien
        // dire comme avant.
        clearReplyTimeout();
        replyTimeoutRef.current = setTimeout(() => {
            if (phaseRef.current === 'processing' && streamRef.current) {
                setReplyTimedOut(true);
                beginTurn();
            }
        }, REPLY_TIMEOUT_MS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sendVoiceMessage, beginTurn]);

    const checkVolume = useCallback(() => {
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
                setPhase('recording');
            }
            silenceStartRef.current = null;
        } else if (speechStartRef.current) {
            if (!silenceStartRef.current) silenceStartRef.current = now;
            const silenceDuration = now - silenceStartRef.current;
            const speechDuration = now - speechStartRef.current;
            if (silenceDuration > SILENCE_DURATION_MS && speechDuration > MIN_SPEECH_MS) {
                endTurn();
            }
        }
    }, [endTurn]);

    const startEmission = async () => {
        setMicError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const ctx = new AudioContext();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            analyserRef.current = analyser;
            beginTurn();
        } catch {
            setMicError("Impossible d'accéder au micro — vérifie l'autorisation dans ton navigateur.");
        }
    };

    // Coupe TOUT, y compris le micro lui-même (nouvelle autorisation
    // nécessaire pour repartir). À utiliser en fin d'enregistrement.
    const stopEmission = useCallback(() => {
        setPhase('off');
        clearVad();
        clearReplyTimeout();
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.onstop = null;
            recorderRef.current.stop();
        }
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current) audioContextRef.current.close();
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        streamRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
    }, []);

    // Coupe seulement l'ÉCOUTE (rien n'est envoyé, le tour en cours est
    // abandonné) — le micro reste ouvert, la reprise est instantanée, sans
    // nouvelle demande d'autorisation. Pensé exactement pour ton cas : un
    // souci technique en pleine conversation, sans que Vanessa "entende"
    // qu'on continue de lui parler pendant que tu le règles.
    const pauseListening = () => {
        clearVad();
        clearReplyTimeout();
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.onstop = null;
            recorderRef.current.stop();
        }
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        setPhase('paused');
    };

    const resumeListening = () => {
        if (streamRef.current) beginTurn();
    };

    // Dès qu'une nouvelle réponse VOCALE de Vanessa arrive, on la joue
    // automatiquement — pendant qu'elle "parle", on n'écoute pas (pour ne
    // jamais capter sa propre voix comme si c'était l'invité). Une fois
    // la lecture terminée, l'écoute reprend toute seule (sauf si on est
    // passé en pause entre-temps).
    useEffect(() => {
        if (phase === 'off' || phase === 'paused') return;
        const lastVanessaAudio = [...messages].reverse().find(
            (m) => m.senderId === VANESSA_USER_ID && m.type === 'audio' && m.audioFileId
        );
        if (lastVanessaAudio && lastVanessaAudio.$id !== lastPlayedMessageId.current) {
            lastPlayedMessageId.current = lastVanessaAudio.$id;
            clearVad();
            clearReplyTimeout();
            setReplyTimedOut(false);
            setPhase('speaking');
            const audio = new Audio(getVoiceMessageUrl(lastVanessaAudio.audioFileId!));
            audioPlayerRef.current = audio;
            audio.onended = () => {
                if (streamRef.current) beginTurn();
            };
            audio.play().catch(() => { if (streamRef.current) beginTurn(); });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    // Coupe tout proprement si la personne quitte la page en cours
    // d'émission — jamais de micro qui reste ouvert en arrière-plan.
    useEffect(() => stopEmission, [stopEmission]);

    // Placé volontairement APRÈS tous les hooks ci-dessus (useState,
    // useRef, useCallback, useEffect) — jamais avant. Un retour anticipé
    // placé plus haut ferait sauter certains hooks tant que `loading` est
    // vrai, puis les ferait apparaître d'un coup une fois le chargement
    // terminé : React l'interdit strictement (nombre de hooks qui doit
    // rester identique à chaque rendu), d'où l'erreur #310 rencontrée.
    if (loading) return <p className="text-sm text-gray-400 text-center py-20">Chargement...</p>;

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-lg mx-auto space-y-5">
                <div className="flex items-center gap-3">
                    <Link to="/emissions" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-lg font-bold text-gray-800">{conversation?.title?.replace('🎙️ ', '') || 'Émission'}</h1>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-1">
                    <p className="text-xs font-semibold text-gray-400">Sujet</p>
                    <p className="text-sm text-gray-700">{conversation?.emissionTopic}</p>
                    {conversation?.emissionPosture && (
                        <>
                            <p className="text-xs font-semibold text-gray-400 pt-2">Posture</p>
                            <p className="text-sm text-gray-700">{conversation.emissionPosture}</p>
                        </>
                    )}
                </div>

                {/* Le vrai indicateur demandé : montre clairement l'état
                    précis de l'émission — sans jamais avoir besoin d'un
                    bouton "envoyer" au fil de la discussion. */}
                <div className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className={`w-24 h-24 rounded-full ${PHASE_COLOR[phase]} flex items-center justify-center transition-colors`}>
                            {(phase === 'recording' || phase === 'listening') && (
                                <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ backgroundColor: 'currentColor' }} />
                            )}
                            <span className="text-white text-2xl relative">🎙️</span>
                        </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">{PHASE_LABEL[phase]}</p>

                    {phase === 'off' ? (
                        <button
                            onClick={startEmission}
                            className="w-full rounded-full py-3.5 font-bold text-sm bg-[#FF4757] hover:bg-[#e63e4d] text-white transition-colors"
                        >
                            Démarrer l'émission
                        </button>
                    ) : (
                        <div className="w-full flex gap-2">
                            {phase === 'paused' ? (
                                <button
                                    onClick={resumeListening}
                                    className="flex-1 rounded-full py-3.5 font-bold text-sm bg-[#FF4757] hover:bg-[#e63e4d] text-white transition-colors"
                                >
                                    Reprendre
                                </button>
                            ) : (
                                <button
                                    onClick={pauseListening}
                                    className="flex-1 rounded-full py-3.5 font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                >
                                    Pause
                                </button>
                            )}
                            <button
                                onClick={stopEmission}
                                className="flex-1 rounded-full py-3.5 font-bold text-sm bg-gray-800 hover:bg-gray-900 text-white transition-colors"
                            >
                                Arrêter
                            </button>
                        </div>
                    )}
                    {micError && <p className="text-xs text-red-500 text-center">{micError}</p>}
                    {sendError && <p className="text-xs text-red-500 text-center font-semibold">⚠️ {sendError}</p>}
                    {replyTimedOut && !sendError && (
                        <p className="text-xs text-amber-600 text-center font-semibold">
                            ⚠️ Sa réponse n'est jamais arrivée (25s) — vérifie les journaux de la Function
                            "send-message" côté Appwrite pour voir la vraie erreur.
                        </p>
                    )}
                    {phase === 'paused' && (
                        <p className="text-xs text-gray-400 text-center">
                            En pause — Vanessa n'écoute plus du tout. Rien n'a été envoyé du tour en cours.
                        </p>
                    )}
                    {phase !== 'off' && phase !== 'paused' && (
                        <p className="text-xs text-gray-400 text-center">
                            Parlez normalement — Vanessa attend une pause pour répondre, aucun bouton à presser.
                        </p>
                    )}
                </div>

                {/* Transcription en direct, pour l'animateur — pas pour le
                    public, aucune émission n'est diffusée en direct. */}
                <div className="space-y-2">
                    {messages.map((m) => (
                        <div key={m.$id} className={`text-xs p-3 rounded-xl ${m.senderId === VANESSA_USER_ID ? 'bg-[#FFF0F1] text-gray-700' : 'bg-white border border-gray-100 text-gray-600'}`}>
                            <span className="font-semibold">{m.senderId === VANESSA_USER_ID ? 'Vanessa' : 'Invité'} — </span>
                            {m.content}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
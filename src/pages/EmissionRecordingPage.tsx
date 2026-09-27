// src/pages/EmissionRecordingPage.tsx — Vanessa
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useConversationThread } from '@/features/messaging/hooks/useConversationThread';
import { getVoiceMessageUrl } from '@/features/messaging/services/messageService';
import { VANESSA_USER_ID } from '@/api/constants';

// --- Réglages de la détection de silence (écoute continue) ---
// Volontairement isolés ici, en toutes lettres : ce sont des valeurs de
// départ raisonnables, mais un micro, une pièce, une distance different —
// un vrai réglage fin ne se fait qu'en conditions réelles de tournage,
// pas en théorie. Ajuste-les après un premier essai si besoin.
const SILENCE_THRESHOLD = 12; // 0-255 — au-dessus : "quelqu'un parle"
const SILENCE_DURATION_MS = 1300; // pause jugée comme "fin du tour de parole"
const MIN_SPEECH_MS = 400; // en dessous : probablement un bruit, pas une vraie phrase
const MAX_TURN_MS = 45_000; // filet de sécurité si personne ne fait jamais de pause

type Phase = 'off' | 'listening' | 'recording' | 'processing' | 'speaking';

const PHASE_LABEL: Record<Phase, string> = {
    off: 'Émission à l\u2019arrêt',
    listening: 'À l\u2019écoute',
    recording: 'Enregistre...',
    processing: 'Réfléchit...',
    speaking: 'Vanessa parle',
};
const PHASE_COLOR: Record<Phase, string> = {
    off: 'bg-gray-300',
    listening: 'bg-blue-400',
    recording: 'bg-red-500',
    processing: 'bg-amber-400',
    speaking: 'bg-[#FF4757]',
};

export default function EmissionRecordingPage() {
    const { id } = useParams<{ id: string }>();
    const { conversation, messages, sendVoiceMessage, loading } = useConversationThread(id!);

    const [phase, setPhase] = useState<Phase>('off');
    const [micError, setMicError] = useState<string | null>(null);

    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const turnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    // Termine le tour de parole en cours : arrête l'enregistrement de CE
    // tour précis, envoie le vocal capturé par le pipeline déjà existant
    // (transcription + réponse texte + réponse vocale, tout est déjà géré
    // côté serveur) — la lecture de sa réponse est gérée par l'effet plus
    // bas, dès qu'elle arrive dans `messages`.
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
        if (blob.size > 0) {
            await sendVoiceMessage(blob, durationSeconds);
        }
        // Si l'envoi échoue ou que rien n'a été capturé, on ne reste pas
        // bloqué en "Réfléchit..." indéfiniment — on relance l'écoute.
        if (phaseRef.current === 'processing') beginTurn();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sendVoiceMessage]);

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

    // Démarre un nouveau tour de parole : un enregistreur frais, une
    // détection de silence fraîche — appelé au démarrage de l'émission ET
    // après chaque réponse de Vanessa, pour repartir sur une écoute propre.
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
    }, [checkVolume, endTurn]);

    const stopEmission = useCallback(() => {
        setPhase('off');
        clearVad();
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

    const toggleEmission = () => {
        if (phase === 'off') startEmission();
        else stopEmission();
    };

    // Dès qu'une nouvelle réponse VOCALE de Vanessa arrive, on la joue
    // automatiquement — pendant qu'elle "parle", on n'écoute pas (pour ne
    // jamais capter sa propre voix comme si c'était l'invité). Une fois
    // la lecture terminée, l'écoute reprend toute seule.
    useEffect(() => {
        if (phase === 'off') return;
        const lastVanessaAudio = [...messages].reverse().find(
            (m) => m.senderId === VANESSA_USER_ID && m.type === 'audio' && m.audioFileId
        );
        if (lastVanessaAudio && lastVanessaAudio.$id !== lastPlayedMessageId.current) {
            lastPlayedMessageId.current = lastVanessaAudio.$id;
            clearVad();
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

                {/* Le vrai indicateur demandé : montre clairement si
                    l'émission est en cours, et ce que Vanessa fait à
                    l'instant précis — sans jamais avoir besoin d'un
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

                    <button
                        onClick={toggleEmission}
                        className={`w-full rounded-full py-3.5 font-bold text-sm transition-colors ${
                            phase === 'off'
                                ? 'bg-[#FF4757] hover:bg-[#e63e4d] text-white'
                                : 'bg-gray-800 hover:bg-gray-900 text-white'
                        }`}
                    >
                        {phase === 'off' ? "Démarrer l'émission" : "Arrêter l'émission"}
                    </button>
                    {micError && <p className="text-xs text-red-500 text-center">{micError}</p>}
                    {phase !== 'off' && (
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
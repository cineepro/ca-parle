// src/features/halte/components/VoiceRecorder.tsx — HALTE
// Enregistreur de message vocal pour les personnes qui ne savent pas écrire (ou n'osent pas). 2 minutes au plus.
// Gros boutons, peu de texte, aucune écriture requise. Le son reste sur le téléphone jusqu'à l'envoi.
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, RotateCcw } from 'lucide-react';

export const VOICE_MAX_SECONDS = 120;
export interface Voice { blob: Blob; seconds: number }

const pickMime = (): string | undefined => {
    const MR = (globalThis as any).MediaRecorder;
    if (!MR?.isTypeSupported) return undefined;
    return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MR.isTypeSupported(t));
};
export const voiceSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof (globalThis as any).MediaRecorder !== 'undefined';

/** Blob → base64 (sans l'en-tête « data: »). */
export const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
});

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function VoiceRecorder({ onChange }: { onChange: (v: Voice | null) => void }) {
    const [state, setState] = useState<'idle' | 'recording' | 'done'>('idle');
    const [seconds, setSeconds] = useState(0);
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const rec = useRef<MediaRecorder | null>(null);
    const stream = useRef<MediaStream | null>(null);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    const chunks = useRef<Blob[]>([]);
    const started = useRef(0);

    const cleanup = () => {
        if (timer.current) clearInterval(timer.current);
        stream.current?.getTracks().forEach((t) => t.stop());
        stream.current = null;
    };
    useEffect(() => () => { cleanup(); }, []);
    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

    const stop = () => { if (rec.current && rec.current.state !== 'inactive') rec.current.stop(); };

    const start = async () => {
        setError(null);
        if (!voiceSupported()) { setError('Ce téléphone ne permet pas d’enregistrer ici. Écris ton message, ou appelle le 138.'); return; }
        try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.current = s;
            const mimeType = pickMime();
            const r = new MediaRecorder(s, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 24000 });
            chunks.current = [];
            r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
            r.onstop = () => {
                cleanup();
                const secs = Math.max(1, Math.round((Date.now() - started.current) / 1000));
                const blob = new Blob(chunks.current, { type: r.mimeType || mimeType || 'audio/webm' });
                if (!blob.size) { setState('idle'); setError('Rien n’a été enregistré. Réessaie.'); return; }
                setUrl(URL.createObjectURL(blob));
                setSeconds(Math.min(secs, VOICE_MAX_SECONDS));
                setState('done');
                onChange({ blob, seconds: Math.min(secs, VOICE_MAX_SECONDS) });
            };
            rec.current = r;
            started.current = Date.now();
            setSeconds(0);
            r.start(1000);
            setState('recording');
            timer.current = setInterval(() => {
                const t = Math.round((Date.now() - started.current) / 1000);
                setSeconds(t);
                if (t >= VOICE_MAX_SECONDS) stop();
            }, 500);
        } catch {
            cleanup();
            setError('Le micro n’est pas autorisé. Autorise-le dans ton navigateur, ou écris ton message.');
        }
    };

    const again = () => { setUrl(null); setState('idle'); setSeconds(0); onChange(null); };

    return (
        <div className="space-y-3">
            {state === 'idle' && (
                <button type="button" onClick={start} className="w-full rounded-3xl bg-brand text-ink min-h-[120px] flex flex-col items-center justify-center gap-2 shadow font-extrabold text-xl active:scale-[0.99]">
                    <Mic size={44} aria-hidden />
                    Appuie ici et parle
                </button>
            )}
            {state === 'recording' && (
                <button type="button" onClick={stop} className="w-full rounded-3xl bg-red-600 text-white min-h-[120px] flex flex-col items-center justify-center gap-1 shadow font-extrabold text-xl" aria-live="polite">
                    <Square size={40} aria-hidden />
                    J’écoute… {fmt(seconds)}
                    <span className="text-sm font-semibold opacity-90">Appuie quand tu as fini (2 minutes au plus)</span>
                </button>
            )}
            {state === 'done' && url && (
                <div className="rounded-3xl bg-white border-2 border-gray-200 p-4 space-y-3">
                    <p className="font-extrabold flex items-center gap-2"><Play size={18} aria-hidden /> Ton message ({fmt(seconds)})</p>
                    <audio src={url} controls className="w-full" />
                    <button type="button" onClick={again} className="inline-flex items-center gap-2 rounded-full border-2 border-gray-200 font-bold px-4 min-h-[48px]"><RotateCcw size={16} aria-hidden /> Recommencer</button>
                </div>
            )}
            {error && <p role="alert" className="rounded-2xl bg-red-50 text-red-800 p-3 font-semibold">{error}</p>}
        </div>
    );
}

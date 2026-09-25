// src/features/messaging/components/MessageComposer.tsx — Vanessa
import { useState, useRef, useEffect } from 'react';

interface Props {
    onSend: (content: string) => void;
    onSendVoice?: (blob: Blob, durationSeconds: number) => void;
    onSendImage?: (file: File) => void;
    sending: boolean;
    // Pré-remplit le champ (ex : suggestion "✍️ Demande-lui de rédiger
    // quelque chose") sans envoyer automatiquement — la personne garde la
    // main pour compléter/modifier avant d'envoyer.
    prefill?: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 Mo

export const MessageComposer = ({ onSend, onSendVoice, onSendImage, sending, prefill }: Props) => {
    const [content, setContent] = useState('');
    const [recording, setRecording] = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);
    const [micError, setMicError] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (prefill) {
            setContent(prefill);
            textareaRef.current?.focus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefill]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        onSend(content);
        setContent('');
    };

    const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // permet de resélectionner le même fichier ensuite
        setImageError(null);
        if (!file || !onSendImage) return;
        if (!file.type.startsWith('image/')) {
            setImageError('Seules les images sont acceptées (pas de vidéo ni de document).');
            return;
        }
        if (file.size > MAX_IMAGE_SIZE) {
            setImageError('Image trop lourde (5 Mo maximum).');
            return;
        }
        onSendImage(file);
    };

    const startRecording = async () => {
        setMicError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
            setMicError("Ton navigateur ne permet pas d'enregistrer de vocal.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                if (timerRef.current) clearInterval(timerRef.current);
                const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setRecording(false);
                setRecordSeconds(0);
                // Ignore les enregistrements trop courts (clic accidentel).
                if (durationSeconds >= 1 && onSendVoice) {
                    onSendVoice(blob, durationSeconds);
                }
            };
            mediaRecorderRef.current = recorder;
            startTimeRef.current = Date.now();
            recorder.start();
            setRecording(true);
            timerRef.current = setInterval(() => {
                setRecordSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 200);
        } catch {
            setMicError('Micro refusé ou indisponible.');
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            // Vide les morceaux capturés pour que onstop n'envoie rien.
            chunksRef.current = [];
            mediaRecorderRef.current.onstop = () => {
                mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
            };
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        setRecordSeconds(0);
    };

    if (recording) {
        return (
            <div className="flex items-center gap-3 p-3 bg-white border-t border-gray-100">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-sm text-gray-600 flex-1">
                    Enregistrement... {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}
                </span>
                <button
                    type="button"
                    onClick={cancelRecording}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2"
                >
                    Annuler
                </button>
                <button
                    type="button"
                    onClick={stopRecording}
                    className="shrink-0 w-10 h-10 rounded-full bg-[#FF4757] text-white flex items-center justify-center hover:bg-[#e63e4d] transition-colors"
                    aria-label="Envoyer le vocal"
                >
                    ➤
                </button>
            </div>
        );
    }

    return (
        <div>
            {micError && <p className="text-xs text-red-500 px-3 pt-2">{micError}</p>}
            {imageError && <p className="text-xs text-red-500 px-3 pt-2">{imageError}</p>}
            <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 bg-white border-t border-gray-100">
                {onSendImage && (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImagePick}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sending}
                            className="shrink-0 w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-40 hover:bg-gray-200 transition-colors"
                            aria-label="Envoyer une photo"
                        >
                            📷
                        </button>
                    </>
                )}

                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    placeholder="Écris un message..."
                    rows={1}
                    maxLength={2000}
                    className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40 max-h-32"
                />

                {content.trim() ? (
                    <button
                        type="submit"
                        disabled={sending}
                        className="shrink-0 w-10 h-10 rounded-full bg-[#FF4757] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#e63e4d] transition-colors"
                        aria-label="Envoyer"
                    >
                        ➤
                    </button>
                ) : onSendVoice ? (
                    <button
                        type="button"
                        onClick={startRecording}
                        disabled={sending}
                        className="shrink-0 w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-40 hover:bg-gray-200 transition-colors"
                        aria-label="Enregistrer un vocal"
                    >
                        🎤
                    </button>
                ) : null}
            </form>
        </div>
    );
};
// src/features/messaging/components/MessageComposer.tsx — Vanessa
import { useState, useRef, useEffect } from 'react';
import { ALLOWED_DOC_EXTENSIONS, MAX_DOC_BYTES } from '../services/messageService';
import { formatFileSize } from '../utils/messagePreview';
import { Camera, FileText, Mic, Paperclip, Send, X } from 'lucide-react';

interface Props {
    onSend: (content: string) => void;
    onSendVoice?: (blob: Blob, durationSeconds: number) => void;
    // Photo ou document, avec une légende : tout part dans UN seul message.
    onSendAttachment?: (file: File, caption: string, kind: 'image' | 'file') => void;
    // Propose aussi les documents (PDF, Word...) en plus des photos.
    allowDocuments?: boolean;
    // Le message auquel on est en train de répondre (encadré au-dessus du champ).
    replyingTo?: { label: string; preview: string } | null;
    onCancelReply?: () => void;
    sending: boolean;
    // Pré-remplit le champ (ex : suggestion "✍️ Demande-lui de rédiger
    // quelque chose") sans envoyer automatiquement — la personne garde la
    // main pour compléter/modifier avant d'envoyer.
    prefill?: string;
    // Démarre une discussion vocale continue (mode appel). Fourni uniquement
    // pour les conversations avec Vanessa ; le micro des notes vocales reste
    // disponible à côté, inchangé.
    onStartCall?: () => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 Mo

export const MessageComposer = ({ onSend, onSendVoice, onSendAttachment, allowDocuments, replyingTo, onCancelReply, sending, prefill, onStartCall }: Props) => {
    const [content, setContent] = useState('');
    const [recording, setRecording] = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);
    const [micError, setMicError] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    // Pièce jointe choisie mais PAS encore envoyée : elle attend la légende
    // éventuelle et le clic sur "Envoyer" (avant, elle partait dès le choix).
    const [attachment, setAttachment] = useState<{ file: File; kind: 'image' | 'file'; previewUrl?: string } | null>(null);
    const [attachMenuOpen, setAttachMenuOpen] = useState(false);
    const docInputRef = useRef<HTMLInputElement>(null);

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

    const clearAttachment = () => {
        setAttachment((current) => {
            if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
            return null;
        });
    };
    useEffect(() => () => { if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl); }, [attachment]);

    useEffect(() => {
        if (replyingTo) textareaRef.current?.focus();
    }, [replyingTo]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (attachment && onSendAttachment) {
            onSendAttachment(attachment.file, content, attachment.kind);
            clearAttachment();
            setContent('');
            return;
        }
        if (!content.trim()) return;
        onSend(content);
        setContent('');
    };

    // Valide puis garde la pièce jointe en attente (aperçu + légende).
    const acceptFile = (file: File, kind: 'image' | 'file') => {
        setImageError(null);
        if (kind === 'image') {
            if (!file.type.startsWith('image/')) {
                setImageError('Ce fichier n\'est pas une image.');
                return;
            }
            if (file.size > MAX_IMAGE_SIZE) {
                setImageError('Image trop lourde (5 Mo maximum).');
                return;
            }
        } else {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            if (!ALLOWED_DOC_EXTENSIONS.includes(ext)) {
                setImageError('Type de document non accepté (PDF, Word, Excel, PowerPoint, texte ou CSV).');
                return;
            }
            if (file.size > MAX_DOC_BYTES) {
                setImageError('Document trop lourd (10 Mo maximum).');
                return;
            }
        }
        clearAttachment();
        setAttachment({ file, kind, previewUrl: kind === 'image' ? URL.createObjectURL(file) : undefined });
        textareaRef.current?.focus();
    };

    const handlePick = (kind: 'image' | 'file') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // permet de resélectionner le même fichier ensuite
        if (file) acceptFile(file, kind);
    };

    // Coller une image depuis le presse-papiers (capture d'écran...).
    const handlePaste = (e: React.ClipboardEvent) => {
        if (!onSendAttachment) return;
        const image = Array.from(e.clipboardData?.files || []).find((f) => f.type.startsWith('image/'));
        if (image) {
            e.preventDefault();
            acceptFile(image, 'image');
        }
    };

    const openAttachMenu = () => {
        if (allowDocuments) setAttachMenuOpen((open) => !open);
        else fileInputRef.current?.click();
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
                    className="shrink-0 w-10 h-10 rounded-full bg-brand text-ink flex items-center justify-center hover:bg-brand-hover transition-colors"
                    aria-label="Envoyer le vocal"
                >
                    <Send className="w-5 h-5" aria-hidden="true" />
                </button>
            </div>
        );
    }

    const canSend = !!content.trim() || !!attachment;

    return (
        <div>
            {micError && <p className="text-xs text-red-500 px-3 pt-2">{micError}</p>}
            {imageError && <p className="text-xs text-red-500 px-3 pt-2">{imageError}</p>}

            {/* Réponse à un message précis */}
            {replyingTo && (
                <div className="flex items-start gap-2 px-3 pt-3 bg-white border-t border-gray-100">
                    <div className="flex-1 min-w-0 rounded-lg bg-gray-50 border-l-4 border-brand px-3 py-1.5">
                        <p className="text-xs font-semibold text-ochre">Réponse à {replyingTo.label}</p>
                        <p className="text-xs text-gray-500 truncate">{replyingTo.preview}</p>
                    </div>
                    <button type="button" onClick={onCancelReply} aria-label="Annuler la réponse" className="shrink-0 w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            )}

            {/* Pièce jointe en attente : aperçu, et la légende se tape juste en dessous */}
            {attachment && (
                <div className="flex items-center gap-3 px-3 pt-3 bg-white border-t border-gray-100">
                    {attachment.kind === 'image' ? (
                        <img src={attachment.previewUrl} alt="Aperçu" className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                    ) : (
                        <span className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center "><Paperclip className="w-6 h-6" aria-hidden="true" /></span>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{attachment.file.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(attachment.file.size)} · ajoute une légende si tu veux</p>
                    </div>
                    <button type="button" onClick={clearAttachment} aria-label="Retirer la pièce jointe" className="shrink-0 w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className={`flex items-end gap-2 p-3 bg-white ${replyingTo || attachment ? '' : 'border-t border-gray-100'}`}>
                {onSendAttachment && (
                    <div className="relative shrink-0">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePick('image')} className="hidden" />
                        <input
                            ref={docInputRef}
                            type="file"
                            accept={ALLOWED_DOC_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
                            onChange={handlePick('file')}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={openAttachMenu}
                            disabled={sending}
                            className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-40 hover:bg-gray-200 transition-colors"
                            aria-label={allowDocuments ? 'Joindre un fichier' : 'Envoyer une photo'}
                        >
                            {allowDocuments ? <Paperclip className="w-5 h-5" aria-hidden="true" /> : <Camera className="w-5 h-5" aria-hidden="true" />}
                        </button>
                        {attachMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setAttachMenuOpen(false)} />
                                <div className="absolute bottom-12 left-0 z-40 w-44 rounded-2xl bg-white shadow-lg border border-gray-100 py-1.5 text-sm text-gray-700">
                                    <button type="button" className="w-full text-left px-4 py-2.5 hover:bg-gray-50" onClick={() => { setAttachMenuOpen(false); fileInputRef.current?.click(); }}>
                                        <Camera className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> Photo
                                    </button>
                                    <button type="button" className="w-full text-left px-4 py-2.5 hover:bg-gray-50" onClick={() => { setAttachMenuOpen(false); docInputRef.current?.click(); }}>
                                        <FileText className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> Document
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    placeholder={attachment ? 'Ajouter une légende...' : replyingTo ? 'Écris ta réponse...' : 'Écris un message...'}
                    rows={1}
                    maxLength={2000}
                    className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand max-h-32"
                />

                {onStartCall && !canSend && (
                    <button
                        type="button"
                        onClick={onStartCall}
                        disabled={sending}
                        title="Discuter en direct avec Vanessa"
                        aria-label="Discuter en direct avec Vanessa"
                        className="shrink-0 w-10 h-10 rounded-full bg-brand-tint text-ochre flex items-center justify-center disabled:opacity-40 hover:bg-brand-strong transition-colors"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <path d="M4 10v4M8 6v12M12 3v18M16 8v8M20 11v2" />
                        </svg>
                    </button>
                )}

                {canSend ? (
                    <button
                        type="submit"
                        disabled={sending}
                        className="shrink-0 w-10 h-10 rounded-full bg-brand text-ink flex items-center justify-center disabled:opacity-40 hover:bg-brand-hover transition-colors"
                        aria-label="Envoyer"
                    >
                        <Send className="w-5 h-5" aria-hidden="true" />
                    </button>
                ) : onSendVoice ? (
                    <button
                        type="button"
                        onClick={startRecording}
                        disabled={sending}
                        className="shrink-0 w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-40 hover:bg-gray-200 transition-colors"
                        aria-label="Enregistrer un vocal"
                    >
                        <Mic className="w-5 h-5" aria-hidden="true" />
                    </button>
                ) : null}
            </form>
        </div>
    );
};
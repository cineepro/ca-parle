// src/features/messaging/components/MessageBubble.tsx — Vanessa
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Message } from '../services/messageService';
import {
    getVoiceMessageUrl, getChatImageUrl, getMessageFileDownloadUrl, messageService,
    parseReplyTo, parseFileMeta, documentsEnabled,
} from '../services/messageService';
import { VANESSA_USER_ID } from '@/api/constants';
import { LinkifiedText } from './LinkifiedText';
import { StatusTicks } from './StatusTicks';
import type { MessageStatus } from '../utils/receipts';
import { getCopyableText, copyToClipboard, formatFileSize } from '../utils/messagePreview';

const formatTime = (dateStr: string): string =>
    new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Détecte le format [[SUGGESTION_POST|titre|contenu]] que Vanessa utilise
// pour proposer de transformer une histoire confiée en publication. Le
// bloc est retiré du texte affiché et remplacé par un bouton dédié —
// jamais publié automatiquement, uniquement si l'utilisateur clique.
function parseSuggestion(content: string): { text: string; suggestion: { title: string; body: string } | null } {
    const match = content.match(/\[\[SUGGESTION_POST\|([^|]+)\|([\s\S]+)\]\]/);
    if (!match) return { text: content, suggestion: null };
    return {
        text: content.slice(0, match.index).trim(),
        suggestion: { title: match[1].trim(), body: match[2].replace(/\]\]$/, '').trim() },
    };
}

// Sur écran tactile : appui long = menu, et pas de sélection de texte
// native qui se déclencherait en même temps.
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const LONG_PRESS_MS = 450;

const fileIcon = (name: string): { emoji: string; bg: string } => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return { emoji: 'PDF', bg: 'bg-red-500' };
    if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)) return { emoji: 'DOC', bg: 'bg-blue-500' };
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return { emoji: 'XLS', bg: 'bg-green-600' };
    if (['ppt', 'pptx', 'odp'].includes(ext)) return { emoji: 'PPT', bg: 'bg-orange-500' };
    return { emoji: 'FILE', bg: 'bg-gray-500' };
};

interface Props {
    message: Message;
    isMine: boolean;
    // null = pas de coches (conversation avec Vanessa, ou message reçu).
    status?: MessageStatus | null;
    senderLabel: (senderId: string) => string;
    onReply?: (message: Message) => void;
    onJumpTo?: (messageId: string) => void;
}

export const MessageBubble = ({ message, isMine, status = null, senderLabel, onReply, onJumpTo }: Props) => {
    const { text, suggestion } = parseSuggestion(message.content || '');
    const isVoice = message.type === 'audio' && !!message.audioFileId;
    const isImage = message.type === 'image' && !!(message.imageFileId || message.localImageUrl);
    const isFile = message.type === 'file';
    const isFromVanessa = !isMine && message.senderId === VANESSA_USER_ID;
    const isPending = message.$id.startsWith('temp-');
    const reply = parseReplyTo(message);
    const fileMeta = isFile ? (parseFileMeta(message) ?? (message.localFile ? { id: '', ...message.localFile, mime: '' } : null)) : null;
    const copyable = getCopyableText(message);

    const [copied, setCopied] = useState(false);
    const [feedback, setFeedback] = useState<'up' | 'down' | ''>(message.feedback || '');
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleCopy = async () => {
        if (!copyable) return;
        if (await copyToClipboard(copyable)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    const handleFeedback = (value: 'up' | 'down') => {
        const next = feedback === value ? '' : value; // re-cliquer retire l'avis
        setFeedback(next);
        messageService.rateFeedback(message.$id, next).catch(() => {
            setFeedback(feedback); // annule l'affichage si l'appel échoue
        });
    };

    // --- Menu d'actions : "⋯" au survol (ordinateur) ou appui long (mobile) ---
    const openMenu = () => {
        if (isPending || !bubbleRef.current) return;
        const rect = bubbleRef.current.getBoundingClientRect();
        const MENU_W = 176;
        const MENU_H = 96;
        const below = rect.bottom + 6 + MENU_H < window.innerHeight;
        const top = below ? rect.bottom + 6 : Math.max(8, rect.top - MENU_H - 6);
        const preferred = isMine ? rect.right - MENU_W : rect.left;
        const left = Math.min(Math.max(8, preferred), window.innerWidth - MENU_W - 8);
        setMenuPos({ top, left });
    };

    const cancelPress = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    useEffect(() => {
        if (!menuPos) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuPos(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menuPos]);
    useEffect(() => cancelPress, []);

    const displayedImageUrl = message.localImageUrl && isPending ? message.localImageUrl : (message.imageFileId ? getChatImageUrl(message.imageFileId) : message.localImageUrl || '');

    return (
        <div id={`msg-${message.$id}`} className={`group flex items-center gap-1 rounded-xl ${isMine ? 'justify-end' : 'justify-start'}`}>
            {/* "⋯" — à gauche de mes messages, à droite des autres */}
            {isMine && !isPending && (
                <button
                    onClick={openMenu}
                    aria-label="Actions sur le message"
                    className="hidden md:flex opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-7 h-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                    ⋯
                </button>
            )}

            <div className="max-w-[75%] min-w-0">
                <div
                    ref={bubbleRef}
                    onTouchStart={() => { cancelPress(); pressTimer.current = setTimeout(openMenu, LONG_PRESS_MS); }}
                    onTouchMove={cancelPress}
                    onTouchEnd={cancelPress}
                    onTouchCancel={cancelPress}
                    onContextMenu={(e) => {
                        // Garde le menu du navigateur sur un lien (copier l'adresse...).
                        if ((e.target as HTMLElement).closest('a')) return;
                        e.preventDefault();
                        openMenu();
                    }}
                    style={IS_TOUCH ? { WebkitTouchCallout: 'none', userSelect: 'none' } : undefined}
                    className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                        isMine
                            ? 'bg-[#FF4757] text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                >
                    {/* Citation : le message auquel celui-ci répond */}
                    {reply && (
                        <button
                            type="button"
                            onClick={() => onJumpTo?.(reply.id)}
                            className={`block w-full text-left rounded-lg px-2.5 py-1.5 mb-1.5 border-l-4 ${
                                isMine ? 'bg-white/15 border-white/70' : 'bg-white border-[#FF4757]'
                            }`}
                        >
                            <span className={`block text-[11px] font-semibold ${isMine ? 'text-white' : 'text-[#FF4757]'}`}>
                                {senderLabel(reply.senderId)}
                            </span>
                            <span className={`block text-xs line-clamp-2 ${isMine ? 'text-white/85' : 'text-gray-600'}`}>
                                {reply.preview}
                            </span>
                        </button>
                    )}

                    {isImage && (
                        <button type="button" onClick={() => !isPending && setViewerOpen(true)} className="block">
                            <img
                                src={displayedImageUrl}
                                alt="Photo envoyée"
                                loading="lazy"
                                className={`max-w-full max-h-64 rounded-xl object-contain bg-black/5 ${isPending ? 'opacity-70' : ''}`}
                            />
                        </button>
                    )}

                    {fileMeta && (() => {
                        const icon = fileIcon(fileMeta.name);
                        const linkable = !!fileMeta.id && documentsEnabled();
                        const inner = (
                            <>
                                <span className={`shrink-0 w-10 h-10 rounded-lg ${icon.bg} text-white text-[10px] font-bold flex items-center justify-center`}>
                                    {icon.emoji}
                                </span>
                                <span className="min-w-0 flex-1 text-left">
                                    <span className="block text-sm font-medium truncate">{fileMeta.name}</span>
                                    <span className={`block text-[11px] ${isMine ? 'text-white/75' : 'text-gray-500'}`}>
                                        {formatFileSize(fileMeta.size)}{linkable ? ' · Ouvrir' : isPending ? ' · Envoi…' : ''}
                                    </span>
                                </span>
                            </>
                        );
                        const cardClass = `flex items-center gap-2.5 rounded-xl p-2 min-w-[200px] ${isMine ? 'bg-white/15' : 'bg-white'}`;
                        return linkable ? (
                            <a href={getMessageFileDownloadUrl(fileMeta.id)} target="_blank" rel="noopener noreferrer" className={cardClass}>{inner}</a>
                        ) : (
                            <div className={cardClass}>{inner}</div>
                        );
                    })()}

                    {isVoice && (
                        <div className="flex items-center gap-2 min-w-[180px]">
                            <span>🎤</span>
                            <audio
                                controls
                                src={getVoiceMessageUrl(message.audioFileId!)}
                                className="max-w-full"
                                style={{ height: '32px' }}
                            />
                        </div>
                    )}

                    {/* Texte : message, ou légende d'une photo / d'un document.
                        Un vocal affiche son lecteur seulement (la transcription
                        reste copiable via le menu). */}
                    {!isVoice && text && (
                        <p className={`whitespace-pre-wrap break-words ${isImage || isFile ? 'mt-1.5' : ''}`}>
                            <LinkifiedText text={text} isMine={isMine} />
                        </p>
                    )}

                    {suggestion && (
                        <div className={`mt-2 rounded-xl p-3 ${isMine ? 'bg-white/15' : 'bg-white'}`}>
                            <p className={`text-xs font-semibold mb-1 ${isMine ? 'text-white' : 'text-purple-600'}`}>
                                📝 {suggestion.title}
                            </p>
                            <p className={`text-xs mb-2 ${isMine ? 'text-white/90' : 'text-gray-600'}`}>{suggestion.body}</p>
                            <Link
                                to={`/publier?title=${encodeURIComponent(suggestion.title)}&content=${encodeURIComponent(suggestion.body)}`}
                                className={`inline-block text-xs font-semibold rounded-full px-3 py-1.5 ${
                                    isMine ? 'bg-white text-[#FF4757]' : 'bg-[#FF4757] text-white'
                                }`}
                            >
                                Publier cette histoire
                            </Link>
                        </div>
                    )}

                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                        {copied && <span className="font-medium">Copié ✓</span>}
                        <span>{formatTime(message.$createdAt)}</span>
                        {isMine && status && <StatusTicks status={status} />}
                    </div>
                </div>

                {/* Copier + réactions — uniquement sur les messages texte de
                    Vanessa, comme sur les interfaces IA habituelles. */}
                {isFromVanessa && text && !suggestion && (
                    <div className="flex items-center gap-1 mt-1 px-1">
                        <button
                            onClick={handleCopy}
                            title="Copier"
                            className="text-gray-300 hover:text-gray-500 transition-colors p-1"
                        >
                            {copied ? (
                                <span className="text-[10px] text-green-500 font-medium">Copié ✓</span>
                            ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={() => handleFeedback('up')}
                            title="Bonne réponse"
                            className={`p-1 transition-colors ${feedback === 'up' ? 'text-green-500' : 'text-gray-300 hover:text-gray-500'}`}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill={feedback === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                                <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                            </svg>
                        </button>
                        <button
                            onClick={() => handleFeedback('down')}
                            title="Mauvaise réponse"
                            className={`p-1 transition-colors ${feedback === 'down' ? 'text-red-500' : 'text-gray-300 hover:text-gray-500'}`}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill={feedback === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                                <path d="M17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {!isMine && !isPending && (
                <button
                    onClick={openMenu}
                    aria-label="Actions sur le message"
                    className="hidden md:flex opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-7 h-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                    ⋯
                </button>
            )}

            {/* Menu d'actions — pas de "Supprimer", volontairement */}
            {menuPos && (
                <div className="fixed inset-0 z-50" onClick={() => setMenuPos(null)}>
                    <div
                        role="menu"
                        style={{ top: menuPos.top, left: menuPos.left }}
                        className="absolute w-44 rounded-2xl bg-white shadow-lg border border-gray-100 py-1.5 text-sm text-gray-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {onReply && (
                            <button
                                role="menuitem"
                                onClick={() => { setMenuPos(null); onReply(message); }}
                                className="w-full text-left px-4 py-2.5 hover:bg-gray-50"
                            >
                                ↩ Répondre
                            </button>
                        )}
                        {copyable && (
                            <button
                                role="menuitem"
                                onClick={() => { setMenuPos(null); handleCopy(); }}
                                className="w-full text-left px-4 py-2.5 hover:bg-gray-50"
                            >
                                ⧉ Copier le texte
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Visionneuse de photo */}
            {viewerOpen && isImage && (
                <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4" onClick={() => setViewerOpen(false)}>
                    <button
                        aria-label="Fermer"
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white text-xl flex items-center justify-center"
                        onClick={() => setViewerOpen(false)}
                    >
                        ✕
                    </button>
                    <img src={displayedImageUrl} alt="Photo en grand" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};
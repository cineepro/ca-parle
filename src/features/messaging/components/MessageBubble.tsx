// src/features/messaging/components/MessageBubble.tsx — Ça Parle
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Message } from '../services/messageService';
import { getVoiceMessageUrl, getChatImageUrl, messageService } from '../services/messageService';
import { VANESSA_USER_ID } from '@/api/constants';

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

export const MessageBubble = ({ message, isMine }: { message: Message; isMine: boolean }) => {
    const { text, suggestion } = parseSuggestion(message.content);
    const isVoice = message.type === 'audio' && !!message.audioFileId;
    const isImage = message.type === 'image' && !!message.imageFileId;
    const isFromVanessa = !isMine && message.senderId === VANESSA_USER_ID;

    const [copied, setCopied] = useState(false);
    const [feedback, setFeedback] = useState<'up' | 'down' | ''>(message.feedback || '');

    const handleCopy = () => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleFeedback = (value: 'up' | 'down') => {
        const next = feedback === value ? '' : value; // re-cliquer retire l'avis
        setFeedback(next);
        messageService.rateFeedback(message.$id, next).catch(() => {
            setFeedback(feedback); // annule l'affichage si l'appel échoue
        });
    };

    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[75%]">
                <div
                    className={`rounded-2xl px-4 py-2.5 text-sm ${
                        isMine
                            ? 'bg-[#FF4757] text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                >
                    {isImage ? (
                        <img
                            src={getChatImageUrl(message.imageFileId!)}
                            alt="Photo envoyée"
                            className="max-w-full max-h-64 rounded-xl object-contain bg-black/5"
                        />
                    ) : isVoice ? (
                        <div className="flex items-center gap-2 min-w-[180px]">
                            <span>🎤</span>
                            <audio
                                controls
                                src={getVoiceMessageUrl(message.audioFileId!)}
                                className="max-w-full"
                                style={{ height: '32px' }}
                            />
                        </div>
                    ) : (
                        text && <p className="whitespace-pre-wrap break-words">{text}</p>
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

                    <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatTime(message.$createdAt)}
                    </p>
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
        </div>
    );
};
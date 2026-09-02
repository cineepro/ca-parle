// src/features/messaging/components/MessageBubble.tsx — Ça Parle
import { Link } from 'react-router-dom';
import type { Message } from '../services/messageService';
import { getVoiceMessageUrl } from '../services/messageService';

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

    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                        ? 'bg-[#FF4757] text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
            >
                {isVoice ? (
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
        </div>
    );
};

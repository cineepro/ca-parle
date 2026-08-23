// src/features/messaging/components/MessageBubble.tsx — Ça Parle
import type { Message } from '../services/messageService';

const formatTime = (dateStr: string): string =>
    new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export const MessageBubble = ({ message, isMine }: { message: Message; isMine: boolean }) => {
    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                        ? 'bg-[#FF4757] text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
            >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                    {formatTime(message.$createdAt)}
                </p>
            </div>
        </div>
    );
};
// src/features/messaging/components/ConversationListItem.tsx — Ça Parle
import { Link } from 'react-router-dom';
import type { ConversationWithParticipant } from '../hooks/useConversations';
import { useAuth } from '@/features/auth/hooks/useAuth';

const timeAgo = (dateStr?: string): string => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} j`;
};

export const ConversationListItem = ({ conversation, otherName }: ConversationWithParticipant) => {
    const { user } = useAuth();
    const isLastFromMe = conversation.lastMessageSenderId === user?.$id;

    return (
        <Link
            to={`/messages/${conversation.$id}`}
            className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
        >
            <div className="w-11 h-11 rounded-full bg-[#FF4757]/10 text-[#FF4757] flex items-center justify-center font-bold shrink-0">
                {otherName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{otherName}</p>
                <p className="text-xs text-gray-400 truncate">
                    {isLastFromMe && conversation.lastMessage ? 'Toi : ' : ''}
                    {conversation.lastMessage || 'Dites bonjour 👋'}
                </p>
            </div>
            <span className="text-[11px] text-gray-300 shrink-0">{timeAgo(conversation.lastMessageAt)}</span>
        </Link>
    );
};
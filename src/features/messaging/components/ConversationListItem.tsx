// src/features/messaging/components/ConversationListItem.tsx — Vanessa
import { Link } from 'react-router-dom';
import type { ConversationWithParticipant } from '../hooks/useConversations';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { conversationService } from '../services/conversationService';
import { Avatar } from '@/components/ui/avatar';
import { StatusTicks } from './StatusTicks';
import { hasUnread, statusAt, isVanessaConversation } from '../utils/receipts';

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
    const otherId = user ? conversationService.getOtherParticipantId(conversation, user.$id) : undefined;
    // Ni point "non lu" ni coches avec Vanessa : elle n'a pas d'appareil.
    const unread = !!user && hasUnread(conversation, user.$id);
    const lastStatus = isLastFromMe && !isVanessaConversation(conversation) ? statusAt(conversation.lastMessageAt, conversation, otherId) : null;

    return (
        <Link
            to={`/messages/${conversation.$id}`}
            className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
        >
            <Avatar name={otherName} userId={otherId} sizeClass="w-11 h-11" />
            <div className="flex-1 min-w-0">
                <p className={`text-sm text-gray-800 truncate ${unread ? 'font-extrabold' : 'font-semibold'}`}>{otherName}</p>
                <p className={`text-xs truncate flex items-center gap-1 ${unread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                    {lastStatus && conversation.lastMessage && <StatusTicks status={lastStatus} onLight />}
                    <span className="truncate">
                        {isLastFromMe && conversation.lastMessage ? 'Toi : ' : ''}
                        {conversation.lastMessage || 'Dites bonjour 👋'}
                    </span>
                </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
                <span className={`text-xs ${unread ? 'text-ochre font-semibold' : 'text-gray-300'}`}>{timeAgo(conversation.lastMessageAt)}</span>
                {unread && <span className="w-2.5 h-2.5 rounded-full bg-brand" aria-label="Message non lu" />}
            </div>
        </Link>
    );
};
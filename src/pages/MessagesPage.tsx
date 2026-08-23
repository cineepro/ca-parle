// src/pages/MessagesPage.tsx — Ça Parle
import { useConversations } from '@/features/messaging/hooks/useConversations';
import { ConversationListItem } from '@/features/messaging/components/ConversationListItem';

export default function MessagesPage() {
    const { items, loading } = useConversations();

    return (
        <div className="px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-4">
                <h1 className="text-xl font-bold text-gray-800">💬 Messages</h1>

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                ) : items.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
                        <div className="text-4xl mb-3">💬</div>
                        <p className="text-sm font-medium text-gray-600">Aucune conversation pour l'instant.</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Envoie un message à l'auteur d'une histoire pour démarrer une discussion.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl divide-y divide-gray-50 overflow-hidden">
                        {items.map(({ conversation, otherName }) => (
                            <ConversationListItem key={conversation.$id} conversation={conversation} otherName={otherName} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
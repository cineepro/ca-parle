// src/pages/MessagesPage.tsx — Vanessa
import { useState } from 'react';
import { useConversations } from '@/features/messaging/hooks/useConversations';
import { ConversationListItem } from '@/features/messaging/components/ConversationListItem';
import { NewConversationModal } from '@/features/messaging/components/NewConversationModal';
import { MessageCircle, Pencil } from 'lucide-react';

export default function MessagesPage() {
    const { items, loading, refresh } = useConversations();
    const [showNewModal, setShowNewModal] = useState(false);

    return (
        <div className="px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-800"><MessageCircle className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> Messages</h1>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="flex items-center gap-1.5 bg-brand-tint text-ochre rounded-full px-3.5 py-2 text-sm font-medium hover:bg-brand-strong transition-colors"
                    >
                        <Pencil className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> Nouveau
                    </button>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                ) : items.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
                        <div className="mb-3"><MessageCircle className="w-11 h-11 text-ochre mx-auto" aria-hidden="true" /></div>
                        <p className="text-sm font-medium text-gray-600">Aucune conversation pour l'instant.</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Recherche quelqu'un ou envoie un message depuis une histoire.
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

            {showNewModal && (
                <NewConversationModal
                    onClose={() => {
                        setShowNewModal(false);
                        refresh();
                    }}
                />
            )}
        </div>
    );
}

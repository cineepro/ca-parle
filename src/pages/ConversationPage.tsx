// src/pages/ConversationPage.tsx — Ça Parle
import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useConversationThread } from '@/features/messaging/hooks/useConversationThread';
import { MessageBubble } from '@/features/messaging/components/MessageBubble';
import { MessageComposer } from '@/features/messaging/components/MessageComposer';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function ConversationPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const {
        otherName, messages, loading, sending, error, sendMessage,
        loadingOlder, hasMoreOlder, loadOlder,
    } = useConversationThread(id!);
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastMessageIdRef = useRef<string | null>(null);
    const prevScrollHeightRef = useRef<number>(0);

    // Défilement automatique vers le bas UNIQUEMENT quand un nouveau
    // message arrive à la FIN (envoi, réponse, temps réel) — jamais quand
    // on charge d'anciens messages en haut (loadOlder), sinon l'utilisateur
    // se retrouverait renvoyé tout en bas alors qu'il consulte l'historique.
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        const lastId = lastMessage?.$id || null;
        if (lastId && lastId !== lastMessageIdRef.current) {
            lastMessageIdRef.current = lastId;
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Conserve la position de lecture quand on charge d'anciens messages :
    // sans ça, ajouter du contenu en haut du conteneur ferait "sauter"
    // visuellement tout ce qu'on est en train de lire vers le bas.
    const handleLoadOlder = async () => {
        if (scrollContainerRef.current) {
            prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
        }
        await loadOlder();
    };

    useEffect(() => {
        if (prevScrollHeightRef.current && scrollContainerRef.current) {
            const newHeight = scrollContainerRef.current.scrollHeight;
            scrollContainerRef.current.scrollTop = newHeight - prevScrollHeightRef.current;
            prevScrollHeightRef.current = 0;
        }
    }, [messages]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <svg className="animate-spin w-8 h-8 text-[#FF4757]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
                <p className="text-gray-500">{error}</p>
                <Link to="/messages" className="text-[#FF4757] font-semibold hover:underline">Retour aux messages</Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto flex flex-col" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-14 z-10">
                <Link to="/messages" className="text-gray-400 hover:text-gray-600">←</Link>
                <div className="w-9 h-9 rounded-full bg-[#FF4757]/10 text-[#FF4757] flex items-center justify-center font-bold text-sm">
                    {otherName.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-gray-800">{otherName}</p>
            </div>

            <div ref={scrollContainerRef} className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                {hasMoreOlder && (
                    <div className="flex justify-center pb-2">
                        <button
                            onClick={handleLoadOlder}
                            disabled={loadingOlder}
                            className="text-xs text-[#FF4757] font-medium bg-[#FF4757]/5 hover:bg-[#FF4757]/10 rounded-full px-4 py-1.5 disabled:opacity-50"
                        >
                            {loadingOlder ? 'Chargement...' : '↑ Charger les messages précédents'}
                        </button>
                    </div>
                )}

                {messages.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">
                        Aucun message. Dis bonjour 👋
                    </p>
                ) : (
                    messages.map((message) => (
                        <MessageBubble key={message.$id} message={message} isMine={message.senderId === user?.$id} />
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            <div className="sticky bottom-20 md:bottom-0">
                <MessageComposer onSend={sendMessage} sending={sending} />
            </div>
        </div>
    );
}
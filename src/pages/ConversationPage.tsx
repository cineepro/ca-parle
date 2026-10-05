// src/pages/ConversationPage.tsx — Vanessa
import { Fragment, useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useConversationThread } from '@/features/messaging/hooks/useConversationThread';
import { MessageBubble } from '@/features/messaging/components/MessageBubble';
import { MessageComposer } from '@/features/messaging/components/MessageComposer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Avatar } from '@/components/ui/avatar';
import { vanessaKnowledgeService, type VanessaConnector } from '@/features/vanessa/services/vanessaKnowledgeService';
import { conversationService } from '@/features/messaging/services/conversationService';
import { useVoiceConversation } from '@/features/messaging/hooks/useVoiceConversation';
import { VoiceCallBar } from '@/features/messaging/components/VoiceCallBar';
import { documentsEnabled, type Message } from '@/features/messaging/services/messageService';
import { getMessageStatus } from '@/features/messaging/utils/receipts';
import { getMessagePreview } from '@/features/messaging/utils/messagePreview';
import { VANESSA_USER_ID } from '@/api/constants';

export default function ConversationPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const {
        conversation, otherName, otherId, messages, loading, sending, error, sendError, sendMessage, sendVoiceMessage,
        sendImageMessage, sendFileMessage, isVanessaConversation,
        loadingOlder, hasMoreOlder, loadOlder, loadOlderUntil, vanessaTyping,
    } = useConversationThread(id!);
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastMessageIdRef = useRef<string | null>(null);
    const prevScrollHeightRef = useRef<number>(0);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    // Connecteurs de partenaires — chargés une seule fois, réutilisés à la
    // fois pour les pastilles du composeur et le badge d'en-tête.
    const [connectors, setConnectors] = useState<VanessaConnector[]>([]);
    const [activeConnectorId, setActiveConnectorId] = useState('');
    const [writingPrefill, setWritingPrefill] = useState<string | undefined>(undefined);
    const [renamingTitle, setRenamingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const [titleOverride, setTitleOverride] = useState<string | undefined>(undefined);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    // Le message auquel la personne est en train de répondre (encadré dans le
    // composeur, puis citation dans le message envoyé).
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [jumpNotice, setJumpNotice] = useState<string | null>(null);
    const navigate = useNavigate();

    // Une réponse commencée ne doit pas suivre d'une conversation à l'autre.
    useEffect(() => { setReplyingTo(null); }, [id]);

    const senderLabel = (senderId: string): string => {
        if (senderId === user?.$id) return 'Toi';
        if (VANESSA_USER_ID && senderId === VANESSA_USER_ID) return 'Vanessa';
        return otherName;
    };

    // Clic sur une citation : on va au message d'origine et on le met en
    // évidence un instant, comme sur WhatsApp. S'il est plus ancien que ce
    // qui est affiché, on remonte l'historique jusqu'à lui (dans la limite
    // de ~300 messages).
    const handleJumpTo = async (messageId: string) => {
        const find = () => document.getElementById(`msg-${messageId}`);
        let el = find();
        if (!el) {
            const found = await loadOlderUntil(messageId);
            if (!found) {
                setJumpNotice("Ce message est trop ancien pour être retrouvé ici.");
                setTimeout(() => setJumpNotice(null), 3000);
                return;
            }
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            el = find();
        }
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background-color 0.4s';
        el.style.backgroundColor = 'rgba(255, 71, 87, 0.14)';
        setTimeout(() => { el!.style.backgroundColor = ''; }, 1600);
    };

    const handleSend = (content: string) => {
        sendMessage(content, replyingTo);
        setReplyingTo(null);
    };
    const handleSendVoice = (blob: Blob, durationSeconds: number) => {
        sendVoiceMessage(blob, durationSeconds, replyingTo);
        setReplyingTo(null);
    };
    const handleSendAttachment = (file: File, caption: string, kind: 'image' | 'file') => {
        if (kind === 'image') sendImageMessage(file, caption, replyingTo);
        else sendFileMessage(file, caption, replyingTo);
        setReplyingTo(null);
    };

    const dayLabel = (iso: string): string => {
        const date = new Date(iso);
        const now = new Date();
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === now.toDateString()) return "Aujourd'hui";
        if (date.toDateString() === yesterday.toDateString()) return 'Hier';
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    };

    const displayTitle = titleOverride ?? conversation?.title;

    const startRenameTitle = () => {
        setTitleInput(displayTitle || '');
        setRenamingTitle(true);
    };

    const confirmRenameTitle = async () => {
        const value = titleInput.trim();
        setRenamingTitle(false);
        if (!value || !conversation) return;
        try {
            await conversationService.renameConversation(conversation.$id, value);
            setTitleOverride(value);
        } catch { /* le titre affiché reste simplement celui d'avant */ }
    };

    // Comme dans la barre latérale : ne supprime jamais réellement, juste
    // masqué de la vue de la personne — on quitte ensuite vers l'accueil
    // puisque cette conversation n'est plus destinée à être revue ici.
    const handleDeleteConversation = async () => {
        if (!conversation) return;
        setConfirmingDelete(false);
        try {
            await conversationService.hideConversation(conversation.$id);
            navigate('/accueil');
        } catch { /* rien de cassé si ça échoue, on reste simplement sur la page */ }
    };

    useEffect(() => {
        if (!isVanessaConversation) return;
        vanessaKnowledgeService.listActiveConnectors().then(setConnectors).catch(() => {});
    }, [isVanessaConversation]);

    // Synchronise l'état local avec le connecteur déjà actif sur cette
    // conversation (persisté en base), une fois qu'elle a fini de charger.
    useEffect(() => {
        if (conversation) setActiveConnectorId(conversation.vanessaConnectorId || '');
    }, [conversation?.$id]);

    const activeConnector = connectors.find((c) => c.$id === activeConnectorId);

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

    // Affiche le bouton "descendre en bas" dès qu'on n'est plus proche du
    // bas de la conversation (utile après avoir remonté lire d'anciens
    // messages, ou reçu de nouveaux messages pendant qu'on lit plus haut).
    const handleScroll = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowScrollToBottom(distanceFromBottom > 200);
    };

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Mode appel : discussion vocale continue avec Vanessa (voir le hook).
    // Placé AVANT les retours anticipés ci-dessous, comme tous les hooks.
    // L'appel se coupe dès qu'on change de conversation ou qu'on quitte la page.
    const call = useVoiceConversation({ messages, sendVoiceMessage, vanessaUserId: VANESSA_USER_ID });
    const stopCall = call.stop;
    useEffect(() => () => stopCall(), [id, stopCall]);

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

    // Indice discret : la dernière chose envoyée est une image de
    // l'utilisateur, Vanessa est dans la conversation, et rien n'a encore
    // répondu à cette image — on suggère de lui demander une description.
    const lastMessage = messages[messages.length - 1];
    const showImageHint = !!(
        isVanessaConversation &&
        lastMessage &&
        lastMessage.type === 'image' &&
        !lastMessage.content &&
        lastMessage.senderId === user?.$id &&
        !vanessaTyping
    );

    return (
        <div className="max-w-2xl mx-auto flex flex-col relative" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
            <div className="bg-white border-b border-gray-100 sticky top-14 md:top-0 z-10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Link to="/messages" className="text-gray-400 hover:text-gray-600">←</Link>
                    <Avatar name={otherName} userId={otherId} sizeClass="w-9 h-9" />
                    <div className="flex-1 min-w-0">
                        {isVanessaConversation && renamingTitle ? (
                            <form onSubmit={(e) => { e.preventDefault(); confirmRenameTitle(); }}>
                                <input
                                    autoFocus
                                    value={titleInput}
                                    onChange={(e) => setTitleInput(e.target.value)}
                                    onBlur={confirmRenameTitle}
                                    onKeyDown={(e) => { if (e.key === 'Escape') setRenamingTitle(false); }}
                                    maxLength={100}
                                    className="text-sm font-semibold text-gray-800 border-b border-[#FF4757]/40 focus:outline-none"
                                />
                            </form>
                        ) : (
                            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 truncate">
                                {isVanessaConversation && displayTitle ? displayTitle : otherName}
                                {isVanessaConversation && (
                                    <button onClick={startRenameTitle} aria-label="Renommer cette conversation" className="text-gray-300 hover:text-gray-500 shrink-0">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                )}
                            </p>
                        )}
                        {activeConnector && (
                            <p className="text-[11px] font-medium" style={{ color: activeConnector.color }}>
                                {activeConnector.icon} {activeConnector.description || activeConnector.name}
                            </p>
                        )}
                    </div>
                    {isVanessaConversation && (
                        confirmingDelete ? (
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-red-500">Supprimer ?</span>
                                <button onClick={handleDeleteConversation} className="text-xs font-bold text-red-600">Oui</button>
                                <button onClick={() => setConfirmingDelete(false)} className="text-xs text-gray-400">Annuler</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmingDelete(true)}
                                aria-label="Supprimer cette conversation"
                                className="shrink-0 p-1.5 text-gray-300 hover:text-red-500"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        )
                    )}
                </div>

                {/* Suggestion discrète, seulement en tout début de
                    conversation — la capacité de rédaction existe déjà
                    (sa personnalité s'applique à toute demande), le seul
                    vrai manque était que personne n'y pensait. */}
                {isVanessaConversation && messages.length <= 2 && (
                    <div className="px-4 pb-2">
                        <button
                            onClick={() => setWritingPrefill(`Vanessa, aide-moi à rédiger un post pour les réseaux sur : `)}
                            className="text-xs font-semibold text-[#FF4757] bg-[#FF4757]/5 hover:bg-[#FF4757]/10 rounded-full px-3 py-1.5"
                        >
                            Demande-lui de rédiger quelque chose
                        </button>
                    </div>
                )}
            </div>

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 px-4 py-4 space-y-2 overflow-y-auto"
            >
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
                    messages.map((message, index) => {
                        const isMine = message.senderId === user?.$id;
                        const showDay = index === 0 || new Date(message.$createdAt).toDateString() !== new Date(messages[index - 1].$createdAt).toDateString();
                        // Pas de coches avec Vanessa : elle n'a pas d'appareil.
                        const status = isMine && !isVanessaConversation ? getMessageStatus(message, conversation, otherId) : null;
                        return (
                            <Fragment key={message.$id}>
                                {showDay && (
                                    <div className="flex justify-center py-1.5">
                                        <span className="text-[11px] text-gray-500 bg-gray-100 rounded-full px-3 py-1 capitalize">
                                            {dayLabel(message.$createdAt)}
                                        </span>
                                    </div>
                                )}
                                <MessageBubble
                                    message={message}
                                    isMine={isMine}
                                    status={status}
                                    senderLabel={senderLabel}
                                    onReply={setReplyingTo}
                                    onJumpTo={handleJumpTo}
                                />
                            </Fragment>
                        );
                    })
                )}

                {showImageHint && (
                    <p className="text-xs text-gray-400 text-center py-1">
                        📷 Envoyée ! Écris un message pour demander à Vanessa ce qu'elle en pense 👀
                    </p>
                )}

                {vanessaTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {showScrollToBottom && (
                <button
                    onClick={scrollToBottom}
                    className="absolute right-4 bottom-20 z-20 w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-500 hover:text-[#FF4757] transition-colors"
                    aria-label="Descendre en bas"
                >
                    ↓
                </button>
            )}

            <div className="sticky bottom-0">
                {sendError && (
                    <p className="text-xs text-red-500 text-center bg-red-50 py-1.5 px-3">{sendError}</p>
                )}
                {jumpNotice && (
                    <p className="text-xs text-gray-500 text-center bg-gray-50 py-1.5 px-3">{jumpNotice}</p>
                )}
                {isVanessaConversation && (
                    <p className="text-[11px] text-gray-400 text-center bg-gray-50 py-1 px-3 border-t border-gray-100">
                        🔮 Vanessa est une intelligence artificielle. Elle peut se tromper.
                    </p>
                )}
                {call.active ? (
                    <VoiceCallBar
                        phase={call.phase}
                        notice={call.notice}
                        micError={call.micError}
                        sendError={sendError}
                        userLine={[...messages].reverse().find((m) => m.senderId !== VANESSA_USER_ID && !m.$id.startsWith('temp-') && m.content && m.content !== '[Message vocal]')?.content}
                        vanessaLine={[...messages].reverse().find((m) => m.senderId === VANESSA_USER_ID)?.content}
                        onPause={call.pause}
                        onResume={call.resume}
                        onEnd={call.stop}
                    />
                ) : (
                    <MessageComposer
                        onSend={handleSend}
                        onSendVoice={handleSendVoice}
                        onSendAttachment={handleSendAttachment}
                        // Avec Vanessa : photos seulement (elle ne lit pas encore les documents).
                        allowDocuments={!isVanessaConversation && documentsEnabled()}
                        replyingTo={replyingTo ? { label: senderLabel(replyingTo.senderId), preview: getMessagePreview(replyingTo) } : null}
                        onCancelReply={() => setReplyingTo(null)}
                        sending={sending}
                        prefill={writingPrefill}
                        onStartCall={isVanessaConversation ? call.start : undefined}
                    />
                )}
            </div>
        </div>
    );
}
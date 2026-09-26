// src/components/layout/Sidebar.tsx — Vanessa
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { vanessaKnowledgeService, type VanessaConnector } from '@/features/vanessa/services/vanessaKnowledgeService';
import { conversationService, type Conversation } from '@/features/messaging/services/conversationService';
import { monthlyQuestionCount, formatQuestionCount, MONTH_LABELS } from '@/features/vanessa/utils/questionCount';
import { SuggestExpressionModal } from '@/features/vanessa/components/SuggestExpressionModal';
import { VANESSA_USER_ID } from '@/api/constants';

interface NavItem {
    to: string;
    label: string;
    badge?: number;
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
    const location = useLocation();
    const isActive = location.pathname === item.to;
    return (
        <Link
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-[#FF4757]/10 text-[#FF4757] font-semibold' : 'text-gray-600 hover:bg-gray-50'
            }`}
        >
            {item.label}
            {!!item.badge && (
                <span className="bg-[#FF4757] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {item.badge > 9 ? '9+' : item.badge}
                </span>
            )}
        </Link>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="px-3 pt-4 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide">{children}</p>;
}

// Section repliable — utilisée uniquement là où la liste peut devenir
// longue (connecteurs, conversations) ; les autres sections restent de
// simples SectionLabel, une liste courte et fixe n'a pas besoin de se
// replier. L'état choisi est mémorisé (localStorage) pour ne pas avoir à
// re-replier à chaque rechargement de page.
function CollapsibleSection({
    title, storageKey, count, children,
}: { title: string; storageKey: string; count: number; children: React.ReactNode }) {
    const [open, setOpen] = useState(() => {
        try {
            const stored = localStorage.getItem(`sidebar-section-${storageKey}`);
            return stored !== null ? stored === 'open' : true;
        } catch {
            return true;
        }
    });

    const toggle = () => {
        setOpen((prev) => {
            const next = !prev;
            try { localStorage.setItem(`sidebar-section-${storageKey}`, next ? 'open' : 'closed'); } catch { /* ignore */ }
            return next;
        });
    };

    return (
        <div>
            <button
                onClick={toggle}
                className="w-full flex items-center justify-between px-3 pt-4 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide hover:text-gray-600"
            >
                <span>{title} {count > 0 && `(${count})`}</span>
                <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
            </button>
            {open && children}
        </div>
    );
}

// "à l'instant" / "il y a 5 min" / "hier" / "12 sept." — assez court pour
// tenir sur une ligne de liste, sans avoir besoin d'une librairie dédiée.
function relativeTime(iso?: string): string {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days} j`;
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount } = useNotifications();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [connectors, setConnectors] = useState<VanessaConnector[]>([]);
    const [activeConnectorId, setActiveConnectorId] = useState('');
    const [switchingConnector, setSwitchingConnector] = useState<string | null>(null);
    const [showSuggestExpression, setShowSuggestExpression] = useState(false);
    const [vanessaConversations, setVanessaConversations] = useState<Conversation[]>([]);
    const [creatingConversation, setCreatingConversation] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    useEffect(() => {
        vanessaKnowledgeService.listActiveConnectors().then(setConnectors).catch(() => {});
    }, []);

    const loadVanessaConversations = () => {
        if (!user?.$id || !VANESSA_USER_ID) return;
        conversationService.listVanessaConversations(user.$id, VANESSA_USER_ID)
            .then(setVanessaConversations)
            .catch(() => {});
    };

    // Sait quel connecteur est actif sur la conversation avec Vanessa, pour
    // pouvoir le surligner ET pour que re-cliquer dessus le désactive au
    // lieu de le réactiver sans effet visible (c'était le bug).
    useEffect(() => {
        if (!user?.$id || !VANESSA_USER_ID) return;
        conversationService.findOrCreateDirect(user.$id, VANESSA_USER_ID)
            .then((conversation) => setActiveConnectorId(conversation.vanessaConnectorId || ''))
            .catch(() => {});
        loadVanessaConversations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.$id]);

    // Recharge la liste à chaque changement de page — c'est ce qui fait
    // apparaître une conversation qui vient tout juste d'être créée, ou
    // remonter en tête celle qui vient de recevoir un nouveau message,
    // sans avoir à recharger toute la barre.
    useEffect(() => {
        loadVanessaConversations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const close = () => setMobileOpen(false);

    const startRename = (c: Conversation) => {
        setRenamingId(c.$id);
        setRenameValue(c.title || '');
    };

    // Enregistre à la fois sur Entrée (soumission du formulaire) et en
    // quittant le champ (onBlur) — pour ne jamais perdre un renommage
    // simplement parce qu'on a cliqué ailleurs sans appuyer sur Entrée.
    const confirmRename = async () => {
        if (!renamingId) return;
        const id = renamingId;
        const value = renameValue.trim();
        setRenamingId(null);
        if (!value) return;
        try {
            await conversationService.renameConversation(id, value);
            setVanessaConversations((prev) => prev.map((c) => (c.$id === id ? { ...c, title: value } : c)));
        } catch { /* pas grave, l'ancien titre reste affiché */ }
    };

    // Ouvre un TOUT NOUVEAU fil de discussion avec Vanessa, distinct des
    // précédents — exactement le principe demandé : plusieurs conversations
    // possibles, une par sujet, comme sur les grandes IA conversationnelles.
    const handleNewConversation = async () => {
        if (!user?.$id || !VANESSA_USER_ID || creatingConversation) return;
        setCreatingConversation(true);
        try {
            const conversation = await conversationService.createNewVanessaConversation(VANESSA_USER_ID);
            navigate(`/messages/${conversation.$id}`);
            close();
        } finally {
            setCreatingConversation(false);
        }
    };

    // Un connecteur peut être choisi depuis N'IMPORTE QUELLE page (pas
    // seulement depuis la conversation avec Vanessa) — on rejoint (ou
    // ouvre) sa conversation, on active/désactive le connecteur dessus,
    // puis on y navigue. findOrCreateDirect ne recrée rien si la
    // conversation existe déjà, donc cet appel reste sans risque même si
    // on y est déjà.
    //
    // Vraie bascule : re-cliquer sur le connecteur déjà actif le désactive
    // (retour au mode général) — avant, cliquer l'activait à nouveau à
    // l'identique, sans aucun changement visible, d'où l'impression que
    // "ça ne se désactive jamais" même en appuyant plusieurs fois.
    const handleSelectConnector = async (connectorId: string) => {
        if (!user?.$id || !VANESSA_USER_ID || switchingConnector) return;
        const next = activeConnectorId === connectorId ? '' : connectorId;
        setSwitchingConnector(connectorId);
        try {
            const conversation = await conversationService.findOrCreateDirect(user.$id, VANESSA_USER_ID);
            await conversationService.setVanessaConnector(conversation.$id, next);
            setActiveConnectorId(next);
            navigate(`/messages/${conversation.$id}`);
            close();
        } finally {
            setSwitchingConnector(null);
        }
    };

    const principal: NavItem[] = [
        { to: '/accueil', label: 'Vanessa' },
        { to: '/ca-parle', label: 'Ça Parle' },
        { to: '/ca-sert', label: 'Ça sert' },
        { to: '/messages', label: 'Messages' },
        { to: '/recherche', label: 'Rechercher' },
        { to: '/notifications', label: 'Notifications', badge: unreadCount },
    ];

    const vanessaEtToi: NavItem[] = [
        { to: '/profil', label: 'Profil' },
        { to: '/memoire', label: 'Ce que Vanessa garde sur toi' },
        { to: '/espace-partenaire', label: 'Espace partenaire' },
        { to: '/mes-references', label: 'Mes références suivies' },
        { to: '/tendances', label: 'Tendances' },
    ];

    const plateforme: NavItem[] = [
        { to: '/documentation', label: 'Comment ça marche' },
        { to: '/privacy', label: 'Politique de confidentialité' },
        { to: '/terms', label: "Conditions d'utilisation" },
    ];

    return (
        <>
            {/* Barre étroite mobile — juste de quoi ouvrir le menu, rien de
                plus. Le vrai contenu de navigation vit entièrement dans le
                panneau déplié ci-dessous. */}
            <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-3">
                <button
                    onClick={() => setMobileOpen(true)}
                    aria-label="Ouvrir le menu"
                    className="text-gray-600 -ml-1 p-1"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                    </svg>
                </button>
                <span className="text-lg font-bold text-[#FF4757]">Vanessa</span>
                {unreadCount > 0 && (
                    <Link to="/notifications" className="ml-auto relative text-gray-400">
                        <span className="bg-[#FF4757] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </Link>
                )}
            </header>

            {/* Fond semi-transparent, mobile uniquement, quand le panneau
                est déplié — un tap dessus referme le menu. */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={close} />
            )}

            {/* Le panneau lui-même — toujours visible sur desktop (fixe, à
                gauche), replié hors-écran par défaut sur mobile, glisse à
                l'ouverture. */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 md:translate-x-0 md:z-20 ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <Link to="/accueil" onClick={close} className="text-xl font-bold text-[#FF4757]">
                        Vanessa
                    </Link>
                    <button onClick={close} className="md:hidden text-gray-400 p-1" aria-label="Fermer le menu">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 pb-4">
                    <SectionLabel>Principal</SectionLabel>
                    <div className="space-y-0.5">
                        {principal.map((item) => (
                            <NavLink key={item.to} item={item} onNavigate={close} />
                        ))}
                    </div>

                    {connectors.length > 0 && (
                        <CollapsibleSection title="Connecteurs" storageKey="connecteurs" count={connectors.length}>
                            <p className="px-3 pb-1.5 text-[11px] text-gray-400">Touche à nouveau pour désactiver</p>
                            <div className="space-y-0.5">
                                {connectors.map((c) => {
                                    const count = monthlyQuestionCount(c);
                                    const isActive = activeConnectorId === c.$id;
                                    return (
                                        <button
                                            key={c.$id}
                                            onClick={() => handleSelectConnector(c.$id)}
                                            disabled={switchingConnector === c.$id}
                                            className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-left disabled:opacity-50 transition-colors"
                                            style={
                                                isActive
                                                    ? { backgroundColor: `${c.color}1A`, color: c.color, fontWeight: 600 }
                                                    : { color: '#4b5563' }
                                            }
                                        >
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: c.color }}
                                            />
                                            <span className="flex-1 truncate">
                                                {switchingConnector === c.$id ? 'Un instant...' : c.name}
                                            </span>
                                            {isActive && !switchingConnector && (
                                                <span className="text-[10px] font-bold shrink-0" style={{ color: c.color }}>
                                                    ACTIF
                                                </span>
                                            )}
                                            {count > 0 && !isActive && (
                                                <span
                                                    className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-[#FF4757] text-white shrink-0"
                                                    title={`${count} question(s) en ${MONTH_LABELS[new Date().getMonth()]}`}
                                                >
                                                    {formatQuestionCount(count)}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </CollapsibleSection>
                    )}

                    <CollapsibleSection title="Conversations avec Vanessa" storageKey="conversations" count={vanessaConversations.length}>
                        <div className="space-y-0.5">
                            <button
                                onClick={handleNewConversation}
                                disabled={creatingConversation}
                                className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#FF4757] hover:bg-[#FF4757]/5 disabled:opacity-50"
                            >
                                <span className="text-lg leading-none">+</span>
                                {creatingConversation ? 'Ouverture...' : 'Nouvelle conversation'}
                            </button>
                            {vanessaConversations.map((c) => {
                                const isCurrent = location.pathname === `/messages/${c.$id}`;
                                const isRenaming = renamingId === c.$id;

                                if (isRenaming) {
                                    return (
                                        <form
                                            key={c.$id}
                                            onSubmit={(e) => { e.preventDefault(); confirmRename(); }}
                                            className="flex items-center gap-1 px-2 py-1"
                                        >
                                            <input
                                                autoFocus
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onBlur={confirmRename}
                                                onKeyDown={(e) => { if (e.key === 'Escape') setRenamingId(null); }}
                                                maxLength={100}
                                                className="flex-1 rounded-lg border border-[#FF4757]/40 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/30"
                                            />
                                        </form>
                                    );
                                }

                                return (
                                    <div
                                        key={c.$id}
                                        className={`group flex items-center gap-1 rounded-xl pr-1.5 transition-colors ${
                                            isCurrent ? 'bg-[#FF4757]/10' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <Link
                                            to={`/messages/${c.$id}`}
                                            onClick={close}
                                            className={`flex-1 min-w-0 flex items-center justify-between gap-2 px-3 py-2.5 text-sm ${
                                                isCurrent ? 'text-[#FF4757] font-semibold' : 'text-gray-600'
                                            }`}
                                        >
                                            <span className="truncate">{c.title || 'Nouvelle conversation'}</span>
                                            <span className="text-[10px] text-gray-400 shrink-0">{relativeTime(c.lastMessageAt)}</span>
                                        </Link>
                                        <button
                                            onClick={() => startRename(c)}
                                            aria-label="Renommer cette conversation"
                                            className="shrink-0 p-1.5 text-gray-300 hover:text-gray-600"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                            {vanessaConversations.length === 0 && (
                                <p className="px-3 py-2 text-xs text-gray-400">Rien pour l'instant.</p>
                            )}
                        </div>
                    </CollapsibleSection>

                    <SectionLabel>Vanessa & toi</SectionLabel>
                    <div className="space-y-0.5">
                        {vanessaEtToi.map((item) => (
                            <NavLink key={item.to} item={item} onNavigate={close} />
                        ))}
                        <button
                            onClick={() => { setShowSuggestExpression(true); close(); }}
                            className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Proposer une expression à Vanessa
                        </button>
                    </div>

                    <SectionLabel>Plateforme</SectionLabel>
                    <div className="space-y-0.5">
                        {plateforme.map((item) => (
                            <NavLink key={item.to} item={item} onNavigate={close} />
                        ))}
                    </div>

                    {user?.isModerator && (
                        <>
                            <SectionLabel>Équipe</SectionLabel>
                            <div className="space-y-0.5">
                                <NavLink item={{ to: '/moderation', label: 'Modération' }} onNavigate={close} />
                            </div>
                        </>
                    )}
                </nav>

                <div className="p-3 border-t border-gray-100">
                    <button
                        onClick={logout}
                        className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
                    >
                        Déconnexion
                    </button>
                </div>
            </aside>

            {showSuggestExpression && <SuggestExpressionModal onClose={() => setShowSuggestExpression(false)} />}
        </>
    );
};
// src/components/layout/Sidebar.tsx — Vanessa
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { vanessaKnowledgeService, type VanessaConnector } from '@/features/vanessa/services/vanessaKnowledgeService';
import { conversationService } from '@/features/messaging/services/conversationService';
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

export const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [connectors, setConnectors] = useState<VanessaConnector[]>([]);
    const [switchingConnector, setSwitchingConnector] = useState<string | null>(null);
    const [showSuggestExpression, setShowSuggestExpression] = useState(false);

    useEffect(() => {
        vanessaKnowledgeService.listActiveConnectors().then(setConnectors).catch(() => {});
    }, []);

    const close = () => setMobileOpen(false);

    // Un connecteur peut être choisi depuis N'IMPORTE QUELLE page (pas
    // seulement depuis la conversation avec Vanessa) — on rejoint (ou
    // ouvre) sa conversation, on active le connecteur dessus, puis on y
    // navigue. findOrCreateDirect ne recrée rien si la conversation existe
    // déjà, donc cet appel reste sans risque même si on y est déjà.
    const handleSelectConnector = async (connectorId: string) => {
        if (!user?.$id || !VANESSA_USER_ID || switchingConnector) return;
        setSwitchingConnector(connectorId);
        try {
            const conversation = await conversationService.findOrCreateDirect(user.$id, VANESSA_USER_ID);
            await conversationService.setVanessaConnector(conversation.$id, connectorId);
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
                        <>
                            <SectionLabel>Connecteurs</SectionLabel>
                            <div className="space-y-0.5">
                                {connectors.map((c) => {
                                    const count = monthlyQuestionCount(c);
                                    return (
                                        <button
                                            key={c.$id}
                                            onClick={() => handleSelectConnector(c.$id)}
                                            disabled={switchingConnector === c.$id}
                                            className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 text-left disabled:opacity-50"
                                        >
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: c.color }}
                                            />
                                            <span className="flex-1 truncate">
                                                {switchingConnector === c.$id ? 'Ouverture...' : c.name}
                                            </span>
                                            {count > 0 && (
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
                        </>
                    )}

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

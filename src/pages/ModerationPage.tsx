// src/pages/ModerationPage.tsx — Ça Parle
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useModerationQueue } from '@/features/moderation/hooks/useModerationQueue';
import { ModerationQueueItem } from '@/features/moderation/components/ModerationQueueItem';
import { NewsletterComposer } from '@/features/newsletter/components/NewsletterComposer';
import { VanessaKnowledgeManager } from '@/features/vanessa/components/VanessaKnowledgeManager';
import { VanessaConnectorManager } from '@/features/vanessa/components/VanessaConnectorManager';
import { CaSertModerationQueue } from '@/features/caSert/components/CaSertModerationQueue';

type Tab = 'signalements' | 'ca-sert' | 'newsletter' | 'connecteurs' | 'connaissances';

export default function ModerationPage() {
    const { items, loading, refresh } = useModerationQueue();
    const [tab, setTab] = useState<Tab>('signalements');

    const tabs: { id: Tab; icon: string; label: string; badge?: number }[] = [
        { id: 'signalements', icon: '🛡️', label: 'Signalements', badge: items.length },
        { id: 'ca-sert', icon: '🧰', label: 'Ça sert' },
        { id: 'newsletter', icon: '📧', label: 'Newsletter' },
        { id: 'connecteurs', icon: '🔗', label: 'Connecteurs' },
        { id: 'connaissances', icon: '🔮', label: 'Connaissances' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* En-tête fixe */}
            <div className="bg-white border-b border-gray-100 sticky top-14 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
                    <Link to="/accueil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-lg font-bold text-gray-800">🛡️ Espace de modération</h1>
                </div>

                {/* Barre d'onglets — façon logiciel, chaque section dans son
                    propre écran, pas empilées les unes sous les autres. */}
                <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                                tab === t.id ? 'bg-[#FF4757] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <span>{t.icon}</span>
                            {t.label}
                            {!!t.badge && (
                                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-white/25' : 'bg-[#FF4757] text-white'}`}>
                                    {t.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contenu de l'onglet actif uniquement */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {tab === 'signalements' && (
                    loading ? (
                        <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                    ) : items.length === 0 ? (
                        <div className="bg-white rounded-3xl p-8 text-center text-gray-400">
                            <div className="text-3xl mb-2">✨</div>
                            <p className="text-sm">Aucun signalement en attente.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <ModerationQueueItem key={item.report.$id} item={item} onResolved={refresh} />
                            ))}
                        </div>
                    )
                )}

                {tab === 'ca-sert' && <CaSertModerationQueue />}
                {tab === 'newsletter' && <NewsletterComposer />}
                {tab === 'connecteurs' && <VanessaConnectorManager />}
                {tab === 'connaissances' && <VanessaKnowledgeManager />}
            </div>
        </div>
    );
}
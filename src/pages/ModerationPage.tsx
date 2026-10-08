// src/pages/ModerationPage.tsx — Vanessa
// La "Console" : supervision de la plateforme + modération, dans un seul
// espace avec sa propre navigation latérale. Chaque section est un écran à
// part ; la section active vit dans l'URL (?section=journal) pour pouvoir
// y renvoyer directement (notifications, liens...).
import { Link, useSearchParams } from 'react-router-dom';
import { useModerationQueue } from '@/features/moderation/hooks/useModerationQueue';
import { ModerationQueueItem } from '@/features/moderation/components/ModerationQueueItem';
import { NewsletterComposer } from '@/features/newsletter/components/NewsletterComposer';
import { VanessaKnowledgeManager } from '@/features/vanessa/components/VanessaKnowledgeManager';
import { VanessaConnectorManager } from '@/features/vanessa/components/VanessaConnectorManager';
import { CaSertModerationQueue } from '@/features/caSert/components/CaSertModerationQueue';
import { VanessaFeedbackReview } from '@/features/vanessa/components/VanessaFeedbackReview';
import { ConsoleOverview } from '@/features/console/components/ConsoleOverview';
import { ConsoleJournal } from '@/features/console/components/ConsoleJournal';
import { ConsoleSystem } from '@/features/console/components/ConsoleSystem';
import { ConsoleAlerts } from '@/features/console/components/ConsoleAlerts';
import { useAlertSummary } from '@/features/console/hooks/useAlertSummary';

type Section =
    | 'overview' | 'alerts' | 'journal' | 'system'
    | 'signalements' | 'ca-sert' | 'avis' | 'connaissances' | 'connecteurs'
    | 'newsletter';

interface NavEntry { id: Section; label: string; badge?: number }
interface NavGroup { title: string; entries: NavEntry[] }

const SECTION_TITLES: Record<Section, string> = {
    overview: "Vue d'ensemble",
    alerts: 'Alertes',
    journal: 'Journal des incidents',
    system: 'Système',
    signalements: 'Signalements',
    'ca-sert': 'Ça sert',
    avis: 'Avis sur Vanessa',
    connaissances: 'Connaissances',
    connecteurs: 'Connecteurs',
    newsletter: 'Newsletter',
};

export default function ModerationPage() {
    const { items, loading, refresh } = useModerationQueue();
    const alertSummary = useAlertSummary(true);
    const [params, setParams] = useSearchParams();
    const requested = params.get('section') as Section | null;
    const section: Section = requested && requested in SECTION_TITLES ? requested : 'overview';
    const go = (id: string) => setParams({ section: id });

    const groups: NavGroup[] = [
        { title: 'Supervision', entries: [
            { id: 'overview', label: "Vue d'ensemble" },
            { id: 'alerts', label: 'Alertes', badge: alertSummary.open },
            { id: 'journal', label: 'Journal' },
            { id: 'system', label: 'Système' },
        ] },
        { title: 'Modération', entries: [
            { id: 'signalements', label: 'Signalements', badge: items.length },
            { id: 'ca-sert', label: 'Ça sert' },
            { id: 'avis', label: 'Avis sur Vanessa' },
            { id: 'connaissances', label: 'Connaissances' },
            { id: 'connecteurs', label: 'Connecteurs' },
        ] },
        { title: 'Communication', entries: [
            { id: 'newsletter', label: 'Newsletter' },
        ] },
    ];

    const itemClass = (active: boolean) =>
        `shrink-0 flex items-center justify-between gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
            active ? 'bg-brand text-ink' : 'text-gray-600 hover:bg-gray-100'
        }`;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex items-center gap-3 mb-4">
                    <Link to="/accueil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-lg font-bold text-gray-800">Console</h1>
                </div>

                <div className="lg:flex lg:gap-6">
                    {/* Navigation : colonne verticale sur grand écran, ligne
                        défilante sur petit écran (les titres de groupe ne
                        s'affichent que sur grand écran). */}
                    <nav className="sticky top-14 lg:top-6 z-10 bg-gray-50 lg:bg-transparent lg:w-56 lg:shrink-0 lg:self-start mb-4 lg:mb-0">
                        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                            {groups.map((group) => (
                                <div key={group.title} className="contents lg:block lg:mb-3">
                                    <p className="hidden lg:block px-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wide">
                                        {group.title}
                                    </p>
                                    {group.entries.map((entry) => (
                                        <button key={entry.id} onClick={() => go(entry.id)} className={`${itemClass(section === entry.id)} lg:w-full`}>
                                            {entry.label}
                                            {!!entry.badge && (
                                                <span className={`text-xs rounded-full px-1.5 py-0.5 ${section === entry.id ? 'bg-white/25' : 'bg-brand text-ink'}`}>
                                                    {entry.badge}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))}
                            <Link to="/emissions" className={`${itemClass(false)} lg:w-full`}>Émissions</Link>
                            <Link to="/import-osm" className={`${itemClass(false)} lg:w-full`}>Import OSM</Link>
                        </div>
                    </nav>

                    <main className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-gray-800 mb-4">{SECTION_TITLES[section]}</h2>

                        {section === 'overview' && <ConsoleOverview onNavigate={go} />}
                        {section === 'alerts' && <ConsoleAlerts />}
                        {section === 'journal' && <ConsoleJournal />}
                        {section === 'system' && <ConsoleSystem />}

                        {section === 'signalements' && (
                            loading ? (
                                <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                            ) : items.length === 0 ? (
                                <div className="bg-white rounded-3xl p-8 text-center text-gray-400">
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

                        {section === 'ca-sert' && <CaSertModerationQueue />}
                        {section === 'avis' && <VanessaFeedbackReview />}
                        {section === 'connaissances' && <VanessaKnowledgeManager />}
                        {section === 'connecteurs' && <VanessaConnectorManager />}
                        {section === 'newsletter' && <NewsletterComposer />}
                    </main>
                </div>
            </div>
        </div>
    );
}
// src/features/console/components/ConsoleZem.tsx — Zem
// Console → Zem : quatre onglets. Sites (le robot lit des sites), Fiches (tes propres informations),
// Connecteurs (les notes de Vanessa), Statistiques (ce que les gens cherchent et ouvrent).
import { useState } from 'react';
import { ConsoleZemSites } from './ConsoleZemSites';
import { ConsoleZemCards } from './ConsoleZemCards';
import { ConsoleZemConnectors } from './ConsoleZemConnectors';
import { ConsoleZemStats } from './ConsoleZemStats';

const TABS = [
    { id: 'sites', label: 'Sites' },
    { id: 'fiches', label: 'Fiches' },
    { id: 'connecteurs', label: 'Connecteurs' },
    { id: 'stats', label: 'Statistiques' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export const ConsoleZem = () => {
    const [tab, setTab] = useState<Tab>('sites');
    return (
        <div>
            <div role="tablist" className="flex gap-1 overflow-x-auto mb-4 pb-1">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`shrink-0 rounded-full px-4 min-h-[40px] text-sm font-semibold transition-colors ${
                            tab === t.id ? 'bg-ink text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-sand'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === 'sites' && <ConsoleZemSites />}
            {tab === 'fiches' && <ConsoleZemCards />}
            {tab === 'connecteurs' && <ConsoleZemConnectors />}
            {tab === 'stats' && <ConsoleZemStats />}
        </div>
    );
};

// src/pages/HomePage.tsx — Vanessa
// "Ça Parle" : deux onglets qu'on parcourt en glissant de gauche à droite.
//   • Ragots : fil plein écran façon TikTok (une histoire par écran).
//   • UAC    : menu du jour des restaurants, actualités des étudiants.
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PhoneReminderBanner } from '@/features/auth/components/PhoneReminderBanner';
import { ReelFeed } from '@/features/stories/components/ReelFeed';
import { UacTab } from '@/features/uac/components/UacTab';
import { CATEGORIES } from '@/config/categories';
import { COUNTRIES } from '@/config/countries';

const TABS = [
    { id: 'ragots', label: 'Ragots' },
    { id: 'uac', label: 'UAC' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function HomePage() {
    const [params] = useSearchParams();
    const initialTab: TabId = params.get('onglet') === 'uac' ? 'uac' : 'ragots';
    const [tab, setTab] = useState<TabId>(initialTab);
    const [category, setCategory] = useState('tout');
    const [country, setCountry] = useState('tous');
    const scroller = useRef<HTMLDivElement>(null);

    // Ouverture directe sur l'onglet demandé (ex. /ca-parle?onglet=uac), sans animation.
    useEffect(() => {
        const el = scroller.current;
        if (el && initialTab === 'uac') el.scrollLeft = el.clientWidth;
    }, [initialTab]);

    const goTo = (id: TabId) => {
        const el = scroller.current;
        if (!el) return setTab(id);
        el.scrollTo({ left: id === 'uac' ? el.clientWidth : 0, behavior: 'smooth' });
    };

    // L'onglet actif suit le glissement du doigt.
    const onScroll = () => {
        const el = scroller.current;
        if (!el) return;
        setTab(el.scrollLeft > el.clientWidth / 2 ? 'uac' : 'ragots');
    };

    return (
        // Hauteur = écran moins la barre du haut sur mobile (h-14 = 3.5rem).
        <div className="relative mx-auto w-full max-w-[480px] h-[calc(100dvh-3.5rem)] md:h-[100dvh] bg-cream md:border-x md:border-gray-200">
            <div ref={scroller} onScroll={onScroll} className="flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide">
                <section className="relative h-full w-full shrink-0 snap-start snap-always" aria-label="Ragots" aria-hidden={tab !== 'ragots'}>
                    <ReelFeed categorySlug={category} countrySlug={country} />
                </section>
                <section className="relative h-full w-full shrink-0 snap-start snap-always bg-cream" aria-label="UAC" aria-hidden={tab !== 'uac'}>
                    <UacTab />
                </section>
            </div>

            {/* Barre flottante : onglets, pays et publier (ragots), catégories (ragots) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-cream via-cream/95 to-transparent px-4 pt-3 pb-6">
                <div className="pointer-events-auto flex items-center gap-2">
                    <div role="tablist" aria-label="Sections de Ça Parle" className="mr-auto flex rounded-full bg-sand p-1">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                role="tab"
                                type="button"
                                aria-selected={tab === t.id}
                                onClick={() => goTo(t.id)}
                                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${tab === t.id ? 'bg-brand text-ink' : 'text-gray-600'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'ragots' && (
                        <>
                            <label className="sr-only" htmlFor="reel-country">Pays</label>
                            <select
                                id="reel-country"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-brand"
                            >
                                {COUNTRIES.map((c) => (
                                    <option key={c.slug} value={c.slug} className="text-ink">
                                        {c.flag} {c.name}
                                    </option>
                                ))}
                            </select>

                            <Link
                                to="/publier"
                                aria-label="Publier une histoire"
                                className="w-10 h-10 rounded-full bg-brand text-ink flex items-center justify-center hover:bg-brand-hover transition-colors"
                            >
                                <Plus className="w-5 h-5" aria-hidden="true" />
                            </Link>
                        </>
                    )}
                </div>

                {tab === 'ragots' && (
                    <>
                        <div className="pointer-events-auto mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="Catégories">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.slug}
                                    type="button"
                                    onClick={() => setCategory(cat.slug)}
                                    aria-pressed={category === cat.slug}
                                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                                        category === cat.slug
                                            ? 'bg-brand text-ink'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-sand'
                                    }`}
                                >
                                    <span aria-hidden="true">{cat.icon}</span>
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        <div className="pointer-events-auto mt-3">
                            <PhoneReminderBanner />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

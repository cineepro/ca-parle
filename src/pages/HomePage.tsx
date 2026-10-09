// src/pages/HomePage.tsx — Vanessa
// "Ça Parle" : fil plein écran façon TikTok. Une histoire par écran, on
// défile pour passer à la suivante, on touche pour ouvrir l'histoire.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PhoneReminderBanner } from '@/features/auth/components/PhoneReminderBanner';
import { ReelFeed } from '@/features/stories/components/ReelFeed';
import { CATEGORIES } from '@/config/categories';
import { COUNTRIES } from '@/config/countries';

export default function HomePage() {
    const [category, setCategory] = useState('tout');
    const [country, setCountry] = useState('tous');

    return (
        // Hauteur = écran moins la barre du haut sur mobile (h-14 = 3.5rem).
        <div className="relative mx-auto w-full max-w-[480px] h-[calc(100dvh-3.5rem)] md:h-[100dvh] bg-ink md:shadow-xl">
            <ReelFeed categorySlug={category} countrySlug={country} />

            {/* Barre flottante : titre, pays, publier, catégories */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-ink/90 via-ink/60 to-transparent px-4 pt-3 pb-8">
                <div className="pointer-events-auto flex items-center gap-2">
                    <h1 className="font-display text-xl font-bold text-white mr-auto">Ça Parle</h1>

                    <label className="sr-only" htmlFor="reel-country">Pays</label>
                    <select
                        id="reel-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="rounded-full bg-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand"
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
                </div>

                <div className="pointer-events-auto mt-3 flex gap-2 overflow-x-auto scrollbar-hide" role="group" aria-label="Catégories">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.slug}
                            type="button"
                            onClick={() => setCategory(cat.slug)}
                            aria-pressed={category === cat.slug}
                            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                                category === cat.slug
                                    ? 'bg-brand text-ink'
                                    : 'bg-white/15 text-white hover:bg-white/25'
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
            </div>
        </div>
    );
}
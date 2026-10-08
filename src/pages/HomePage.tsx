// src/pages/HomePage.tsx — Vanessa
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PhoneReminderBanner } from '@/features/auth/components/PhoneReminderBanner';
import { CategoryFilter } from '@/features/stories/components/CategoryFilter';
import { CountryFilter } from '@/features/stories/components/CountryFilter';
import { Plus } from 'lucide-react';
import { StoryFeed } from '@/features/stories/components/StoryFeed';

export default function HomePage() {
    const { user } = useAuth();
    const [category, setCategory] = useState('tout');
    const [country, setCountry] = useState('tous');

    return (
        <div className="px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-ink">Ça Parle</h1>
                        <p className="text-sm text-gray-600">Ce qui se raconte maintenant, {user?.name || ''}</p>
                    </div>
                    <CountryFilter selected={country} onSelect={setCountry} />
                </div>

                <PhoneReminderBanner />

                <CategoryFilter selected={category} onSelect={setCategory} />

                <StoryFeed categorySlug={category} countrySlug={country} />
            </div>

            <Link
                to="/publier"
                className="fixed bottom-4 md:bottom-8 right-4 md:right-8 flex items-center gap-2 bg-brand text-ink font-display font-semibold text-base px-5 py-3 min-h-[48px] rounded-full shadow-lg hover:bg-brand-hover transition-colors z-30"
            >
                <Plus className="w-5 h-5" aria-hidden="true" />
                Publier une histoire
            </Link>
        </div>
    );
}
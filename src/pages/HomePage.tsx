// src/pages/HomePage.tsx — Vanessa
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PhoneReminderBanner } from '@/features/auth/components/PhoneReminderBanner';
import { CategoryFilter } from '@/features/stories/components/CategoryFilter';
import { CountryFilter } from '@/features/stories/components/CountryFilter';
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
                        <h1 className="text-xl font-bold text-[#FF4757]">Ça Parle</h1>
                        <p className="text-xs text-gray-400">Ce qui se raconte maintenant, {user?.name || ''}</p>
                    </div>
                    <CountryFilter selected={country} onSelect={setCountry} />
                </div>

                <PhoneReminderBanner />

                <CategoryFilter selected={category} onSelect={setCategory} />

                <StoryFeed categorySlug={category} countrySlug={country} />
            </div>

            <Link
                to="/publier"
                className="fixed bottom-4 md:bottom-8 right-4 md:right-8 flex items-center gap-2 bg-[#FF4757] text-white font-semibold text-sm px-4 py-3 rounded-full shadow-lg hover:bg-[#e63e4d] transition-colors z-30"
            >
                Publier une histoire
            </Link>
        </div>
    );
}
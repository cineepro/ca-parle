// src/pages/HomePage.tsx — Ça Parle
import { useState } from 'react';
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
                        <h1 className="text-xl font-bold text-[#FF4757]">🔥 Ce qui se raconte maintenant</h1>
                        <p className="text-xs text-gray-400">Salut {user?.name || ''} 👋</p>
                    </div>
                    <CountryFilter selected={country} onSelect={setCountry} />
                </div>

                <PhoneReminderBanner />

                <CategoryFilter selected={category} onSelect={setCategory} />

                <StoryFeed categorySlug={category} countrySlug={country} />
            </div>
        </div>
    );
}
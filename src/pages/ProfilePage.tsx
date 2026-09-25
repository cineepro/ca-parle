// src/pages/ProfilePage.tsx — Vanessa
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useReputation } from '@/features/reputation/hooks/useReputation';
import { ReputationCard } from '@/features/reputation/components/ReputationCard';
import { BadgeGrid } from '@/features/reputation/components/BadgeGrid';
import { PhoneReminderBanner } from '@/features/auth/components/PhoneReminderBanner';
import { InviteButton } from '@/features/stories/components/InviteButton';

export default function ProfilePage() {
    const { user } = useAuth();
    const { stats, catalog, earnedKeys, loading } = useReputation(user?.$id);

    if (loading || !stats) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <svg className="animate-spin w-8 h-8 text-[#FF4757]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link to="/accueil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-xl font-bold text-gray-800">Mon profil</h1>
                    <span className="ml-auto"><InviteButton /></span>
                </div>

                <PhoneReminderBanner />

                <ReputationCard stats={stats} name={user?.name} />
                <BadgeGrid catalog={catalog} earnedKeys={earnedKeys} />
            </div>
        </div>
    );
}
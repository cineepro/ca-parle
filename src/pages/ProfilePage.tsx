// src/pages/ProfilePage.tsx — Ça Parle
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useReputation } from '@/features/reputation/hooks/useReputation';
import { ReputationCard } from '@/features/reputation/components/ReputationCard';
import { BadgeGrid } from '@/features/reputation/components/BadgeGrid';
import { PhoneReminderBanner } from '@/features/auth/components/PhoneReminderBanner';
import { InviteButton } from '@/features/stories/components/InviteButton';
import { VanessaMemoryPanel } from '@/features/vanessa/components/VanessaMemoryPanel';
import { SuggestExpressionModal } from '@/features/vanessa/components/SuggestExpressionModal';

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const { stats, catalog, earnedKeys, loading } = useReputation(user?.$id);
    const [showSuggestExpression, setShowSuggestExpression] = useState(false);

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

                <VanessaMemoryPanel />

                <div className="bg-white rounded-3xl divide-y divide-gray-50 overflow-hidden">
                    <Link to="/tendances" className="flex items-center justify-between px-5 py-4 text-sm text-gray-600 hover:bg-gray-50">
                        ⭐ Tendances
                        <span className="text-gray-300">›</span>
                    </Link>
                    <Link to="/espace-partenaire" className="flex items-center justify-between px-5 py-4 text-sm text-gray-600 hover:bg-gray-50">
                        🤝 Espace partenaire
                        <span className="text-gray-300">›</span>
                    </Link>
                    <button
                        onClick={() => setShowSuggestExpression(true)}
                        className="w-full flex items-center justify-between px-5 py-4 text-sm text-gray-600 hover:bg-gray-50 text-left"
                    >
                        💡 Proposer une expression à Vanessa
                        <span className="text-gray-300">›</span>
                    </button>
                    <Link to="/mes-references" className="flex items-center justify-between px-5 py-4 text-sm text-gray-600 hover:bg-gray-50">
                        🔎 Mes références suivies
                        <span className="text-gray-300">›</span>
                    </Link>
                    <Link to="/documentation" className="flex items-center justify-between px-5 py-4 text-sm text-gray-600 hover:bg-gray-50">
                        📖 Comment ça marche
                        <span className="text-gray-300">›</span>
                    </Link>
                    <Link to="/privacy" className="flex items-center justify-between px-5 py-4 text-sm text-gray-600 hover:bg-gray-50">
                        🔒 Politique de confidentialité
                        <span className="text-gray-300">›</span>
                    </Link>
                    <Link to="/terms" className="flex items-center justify-between px-5 py-4 text-sm text-gray-600 hover:bg-gray-50">
                        📄 Conditions d'utilisation
                        <span className="text-gray-300">›</span>
                    </Link>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-between px-5 py-4 text-sm text-red-500 hover:bg-red-50 text-left"
                    >
                        🚪 Déconnexion
                        <span className="text-red-200">›</span>
                    </button>
                </div>
            </div>

            {showSuggestExpression && <SuggestExpressionModal onClose={() => setShowSuggestExpression(false)} />}
        </div>
    );
}
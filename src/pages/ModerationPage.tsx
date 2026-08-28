// src/pages/ModerationPage.tsx — Ça Parle
import { Link } from 'react-router-dom';
import { useModerationQueue } from '@/features/moderation/hooks/useModerationQueue';
import { ModerationQueueItem } from '@/features/moderation/components/ModerationQueueItem';
import { NewsletterComposer } from '@/features/newsletter/components/NewsletterComposer';

export default function ModerationPage() {
    const { items, loading, refresh } = useModerationQueue();

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link to="/accueil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-xl font-bold text-gray-800">🛡️ Modération</h1>
                    <span className="text-xs text-gray-400 ml-auto">{items.length} signalement{items.length > 1 ? 's' : ''} en attente</span>
                </div>

                <NewsletterComposer />

                {loading ? (
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
                )}
            </div>
        </div>
    );
}
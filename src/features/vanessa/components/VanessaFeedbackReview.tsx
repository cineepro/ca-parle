// src/features/vanessa/components/VanessaFeedbackReview.tsx — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

interface FeedbackMessage {
    $id: string;
    conversationId: string;
    reply: string;
    createdAt: string;
    question: string | null;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const VanessaFeedbackReview = () => {
    const [tab, setTab] = useState<'down' | 'up'>('down');
    const [messages, setMessages] = useState<FeedbackMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (type: 'down' | 'up') => {
        setLoading(true);
        try {
            const result = await callFunction<{ messages: FeedbackMessage[] }>(FUNCTIONS.LIST_MESSAGE_FEEDBACK, { action: 'list', type });
            setMessages(result.messages);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(tab);
    }, [tab, load]);

    return (
        <div className="bg-white rounded-3xl p-6 space-y-4">
            <div>
                <h2 className="text-base font-bold text-gray-800">Avis sur les réponses de Vanessa</h2>
                <p className="text-xs text-gray-400 mt-1">
                    Ce que les utilisateurs pensent réellement de ses réponses — pour repérer où elle dérape et
                    ajuster le lexique ou le prompt en conséquence.
                </p>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => setTab('down')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === 'down' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                    À revoir
                </button>
                <button
                    onClick={() => setTab('up')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === 'up' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                    Ce qui marche bien
                </button>
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
            ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                    {tab === 'down' ? "Aucune réponse mal notée pour l'instant — bon signe." : 'Aucune réponse appréciée pour l\'instant.'}
                </div>
            ) : (
                <div className="space-y-3">
                    {messages.map((m) => (
                        <div key={m.$id} className={`rounded-2xl p-4 border ${tab === 'down' ? 'border-red-100 bg-red-50/40' : 'border-green-100 bg-green-50/40'}`}>
                            <p className="text-[11px] text-gray-400 mb-1.5">{formatDate(m.createdAt)}</p>
                            {m.question && (
                                <p className="text-xs text-gray-500 mb-1.5">
                                    <span className="font-semibold">Question :</span> {m.question}
                                </p>
                            )}
                            <p className="text-sm text-gray-800">
                                <span className="font-semibold">Vanessa :</span> {m.reply}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
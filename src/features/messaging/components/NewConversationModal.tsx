// src/features/messaging/components/NewConversationModal.tsx — Ça Parle
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserSearch } from '../hooks/useUserSearch';
import { conversationService } from '../services/conversationService';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const NewConversationModal = ({ onClose }: { onClose: () => void }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [starting, setStarting] = useState<string | null>(null);
    const { results, loading } = useUserSearch(query);

    const handleSelect = async (otherUserId: string) => {
        if (!user || starting) return;
        setStarting(otherUserId);
        try {
            const conversation = await conversationService.findOrCreateDirect(user.$id, otherUserId);
            navigate(`/messages/${conversation.$id}`);
            onClose();
        } finally {
            setStarting(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-24 z-50 px-4" onClick={onClose}>
            <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-800">✏️ Nouveau message</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher une personne par son nom..."
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                />

                <div className="max-h-64 overflow-y-auto space-y-1">
                    {loading && <p className="text-xs text-gray-400 px-1 py-2">Recherche...</p>}

                    {!loading && query.trim() && results.length === 0 && (
                        <p className="text-xs text-gray-400 px-1 py-2">Personne trouvé avec ce nom.</p>
                    )}

                    {results.map((result) => (
                        <button
                            key={result.$id}
                            onClick={() => handleSelect(result.$id)}
                            disabled={starting === result.$id}
                            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 text-left disabled:opacity-50"
                        >
                            <div className="w-9 h-9 rounded-full bg-[#FF4757]/10 text-[#FF4757] flex items-center justify-center font-bold text-sm shrink-0">
                                {result.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-700">{result.name}</span>
                            {starting === result.$id && <span className="ml-auto text-xs text-gray-400">Ouverture...</span>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
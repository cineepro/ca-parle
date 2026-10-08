// src/features/messaging/components/NewConversationModal.tsx — Vanessa
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserSearch } from '../hooks/useUserSearch';
import { conversationService } from '../services/conversationService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Modal } from '@/components/ui/modal';
import { inputClasses } from '@/components/ui/input';

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
        <Modal open onClose={onClose} title="Nouveau message">
            <div className="space-y-3">
                <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher une personne par son nom..."
                    aria-label="Rechercher une personne"
                    className={inputClasses}
                />

                <div className="max-h-64 overflow-y-auto space-y-1">
                    {loading && <p role="status" className="text-sm text-gray-600 px-1 py-2">Recherche...</p>}

                    {!loading && query.trim() && results.length === 0 && (
                        <p className="text-sm text-gray-600 px-1 py-2">Personne trouvée avec ce nom.</p>
                    )}

                    {results.map((result) => (
                        <button
                            key={result.$id}
                            onClick={() => handleSelect(result.$id)}
                            disabled={starting === result.$id}
                            className="w-full flex items-center gap-3 px-2 py-2 min-h-[48px] rounded-xl hover:bg-sand text-left disabled:opacity-50"
                        >
                            <div className="w-9 h-9 rounded-full bg-brand-tint text-ochre flex items-center justify-center font-display font-bold text-sm shrink-0">
                                {result.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-base text-ink">{result.name}</span>
                            {starting === result.$id && <span className="ml-auto text-sm text-gray-600">Ouverture...</span>}
                        </button>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

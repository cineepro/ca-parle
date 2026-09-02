// src/features/vanessa/components/VanessaButton.tsx — Ça Parle
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VANESSA_USER_ID, VANESSA_AVATAR_URL } from '@/api/constants';
import { conversationService } from '@/features/messaging/services/conversationService';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const VanessaButton = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    if (!VANESSA_USER_ID || user?.$id === VANESSA_USER_ID) return null;

    const handleClick = async () => {
        if (!user || loading) return;
        setLoading(true);
        try {
            const conversation = await conversationService.findOrCreateDirect(user.$id, VANESSA_USER_ID);
            navigate(`/messages/${conversation.$id}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-[#FF4757] text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-70"
            title="Discuter avec Vanessa"
        >
            {loading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
            ) : (
                <img src={VANESSA_AVATAR_URL} alt="" className="w-5 h-5 rounded-full object-cover" />
            )}
            {loading ? 'Ouverture...' : 'Vanessa'}
        </button>
    );
};

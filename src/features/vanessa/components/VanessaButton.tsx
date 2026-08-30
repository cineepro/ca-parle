// src/features/vanessa/components/VanessaButton.tsx — Ça Parle
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VANESSA_USER_ID } from '@/api/constants';
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
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-[#FF4757] text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            title="Discuter avec Vanessa"
        >
            🔮 Vanessa
        </button>
    );
};
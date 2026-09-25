// src/pages/VanessaHomePage.tsx — Vanessa
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VANESSA_USER_ID } from '@/api/constants';
import { conversationService } from '@/features/messaging/services/conversationService';
import { useAuth } from '@/features/auth/hooks/useAuth';

// Vanessa est désormais l'expérience principale de la plateforme — c'est
// elle qui s'ouvre par défaut, pas un fil d'histoires. Les autres
// fonctionnalités (Ça Parle, Ça sert) restent accessibles comme des
// sections à part entière depuis la navigation, exactement comme des
// applications qui mettent en avant leur produit phare tout en gardant
// d'autres outils autour.
export default function VanessaHomePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const requested = useRef(false);

    useEffect(() => {
        if (!user?.$id || !VANESSA_USER_ID || requested.current) return;
        requested.current = true;
        conversationService.findOrCreateDirect(user.$id, VANESSA_USER_ID).then((conversation) => {
            navigate(`/messages/${conversation.$id}`, { replace: true });
        });
    }, [user?.$id, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
            <div className="w-10 h-10 border-3 border-[#FF4757] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Ouverture de ta conversation avec Vanessa...</p>
        </div>
    );
}

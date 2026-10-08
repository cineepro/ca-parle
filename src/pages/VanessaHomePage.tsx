// src/pages/VanessaHomePage.tsx — Vanessa
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VANESSA_USER_ID } from '@/api/constants';
import { conversationService } from '@/features/messaging/services/conversationService';
import { VANESSA_AVATAR_URL } from '@/api/constants';
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
            <img src={VANESSA_AVATAR_URL} alt="" className="w-20 h-20 rounded-full object-cover ring-4 ring-brand animate-pulse" />
            <p role="status" className="text-base text-gray-600">Ouverture de ta conversation avec Vanessa...</p>
        </div>
    );
}

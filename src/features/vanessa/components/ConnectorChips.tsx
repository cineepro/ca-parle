// src/features/vanessa/components/ConnectorChips.tsx — Ça Parle
import { useState } from 'react';
import type { VanessaConnector } from '../services/vanessaKnowledgeService';
import { conversationService } from '@/features/messaging/services/conversationService';
import { monthlyQuestionCount, formatQuestionCount, MONTH_LABELS } from '../utils/questionCount';

interface Props {
    conversationId: string;
    connectors: VanessaConnector[];
    activeConnectorId: string;
    onChanged: (connectorId: string) => void;
}

export const ConnectorChips = ({ conversationId, connectors, activeConnectorId, onChanged }: Props) => {
    const [switching, setSwitching] = useState(false);

    if (connectors.length === 0) return null;

    const handleTap = async (connectorId: string) => {
        if (switching) return;
        // Appuyer à nouveau sur le connecteur déjà actif revient au mode
        // général — comportement "bascule" plutôt qu'un simple bouton.
        const next = activeConnectorId === connectorId ? '' : connectorId;
        setSwitching(true);
        try {
            await conversationService.setVanessaConnector(conversationId, next);
            onChanged(next);
        } finally {
            setSwitching(false);
        }
    };

    return (
        <div className="flex items-center gap-2 px-3 pt-2 overflow-x-auto">
            {connectors.map((c) => {
                const isActive = activeConnectorId === c.$id;
                const count = monthlyQuestionCount(c);
                return (
                    <button
                        key={c.$id}
                        type="button"
                        onClick={() => handleTap(c.$id)}
                        disabled={switching}
                        title={`${c.description}${count > 0 ? ` — ${count} question(s) posée(s) en ${MONTH_LABELS[new Date().getMonth()]}` : ''}`}
                        className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all disabled:opacity-50"
                        style={
                            isActive
                                ? { backgroundColor: c.color, borderColor: c.color, color: 'white' }
                                : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#4b5563' }
                        }
                    >
                        <span>{c.icon}</span>
                        {c.name}
                        {/* Preuve concrète d'engagement — visible par tous,
                            pas seulement en modération. C'est cet indicateur
                            qu'un partenaire peut montrer à ses propres
                            clients/institutions. */}
                        {count > 0 && (
                            <span
                                className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                                    isActive ? 'bg-white/25 text-white' : 'bg-[#FF4757] text-white'
                                }`}
                            >
                                {formatQuestionCount(count)}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
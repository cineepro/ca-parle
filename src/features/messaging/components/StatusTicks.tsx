// src/features/messaging/components/StatusTicks.tsx — Vanessa
import type { MessageStatus } from '../utils/receipts';

const LABELS: Record<MessageStatus, string> = {
    pending: 'Envoi en cours',
    sent: 'Envoyé',
    delivered: 'Reçu',
    read: 'Lu',
};

// ⏱ en cours · ✓ envoyé · ✓✓ reçu · ✓✓ coloré = lu — comme sur WhatsApp.
// `onLight` : sur fond clair (liste de conversations) — gris, et bleu quand lu.
export const StatusTicks = ({ status, onLight = false }: { status: MessageStatus; onLight?: boolean }) => {
    const color = onLight
        ? (status === 'read' ? 'text-sky-500' : 'text-gray-400')
        : (status === 'read' ? 'text-cyan-200' : 'text-white/70');
    return (
        <span className={`inline-flex items-center ${color}`} title={LABELS[status]} aria-label={LABELS[status]}>
            {status === 'pending' ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                </svg>
            ) : (
                <svg width="16" height="11" viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5,6.5 5,10 11.5,2" />
                    {(status === 'delivered' || status === 'read') && <polyline points="7,9.2 8,10 15.5,2" />}
                </svg>
            )}
        </span>
    );
};
// src/features/moderation/components/ReportButton.tsx — Vanessa
import { useState } from 'react';
import { ReportModal } from './ReportModal';
import type { ReportTargetType } from '../services/reportService';

interface Props {
    targetType: ReportTargetType;
    targetId: string;
    label?: string;
}

export const ReportButton = ({ targetType, targetId, label = '🚩 Signaler' }: Props) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
                {label}
            </button>
            {open && <ReportModal targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} />}
        </>
    );
};

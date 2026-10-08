// src/features/moderation/components/ReportButton.tsx — Vanessa
import { useState } from 'react';
import { ReportModal } from './ReportModal';
import type { ReportTargetType } from '../services/reportService';
import { Flag } from 'lucide-react';

interface Props {
    targetType: ReportTargetType;
    targetId: string;
    label?: React.ReactNode;
}

export const ReportButton = ({ targetType, targetId, label }: Props) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 transition-colors min-h-[32px]"
            >
                {label ?? <><Flag className="w-4 h-4" aria-hidden="true" /> Signaler</>}
            </button>
            {open && <ReportModal targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} />}
        </>
    );
};

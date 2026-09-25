// src/features/moderation/components/ReportModal.tsx — Vanessa
import { useState } from 'react';
import { useReport } from '../hooks/useReport';
import { REPORT_REASON_LABELS, type ReportReason, type ReportTargetType } from '../services/reportService';
import { Button } from '@/components/ui/button';

interface Props {
    targetType: ReportTargetType;
    targetId: string;
    onClose: () => void;
}

export const ReportModal = ({ targetType, targetId, onClose }: Props) => {
    const { submitReport, submitting, error, success } = useReport(targetType, targetId);
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) return;
        submitReport(reason, description);
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
                {success ? (
                    <div className="text-center space-y-2 py-4">
                        <div className="text-3xl">✅</div>
                        <p className="text-sm font-medium text-gray-700">Signalement envoyé.</p>
                        <p className="text-xs text-gray-400">Notre équipe va l'examiner rapidement.</p>
                        <Button className="w-full mt-2" onClick={onClose}>Fermer</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <h2 className="text-base font-bold text-gray-800">🚩 Signaler ce contenu</h2>

                        <div className="space-y-1.5">
                            {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((r) => (
                                <label
                                    key={r}
                                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm cursor-pointer border transition-all ${
                                        reason === r ? 'border-[#FF4757] bg-[#FF4757]/5' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        checked={reason === r}
                                        onChange={() => setReason(r)}
                                        className="accent-[#FF4757]"
                                    />
                                    {REPORT_REASON_LABELS[r]}
                                </label>
                            ))}
                        </div>

                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Précise le problème (optionnel)"
                            rows={2}
                            maxLength={500}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40 resize-none"
                        />

                        {error && <p className="text-xs text-red-500">{error}</p>}

                        <div className="flex gap-2">
                            <Button type="submit" isLoading={submitting} disabled={!reason} className="flex-1">
                                Envoyer
                            </Button>
                            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

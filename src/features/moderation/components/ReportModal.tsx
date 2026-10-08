// src/features/moderation/components/ReportModal.tsx — Vanessa
import { useState } from 'react';
import { useReport } from '../hooks/useReport';
import { REPORT_REASON_LABELS, type ReportReason, type ReportTargetType } from '../services/reportService';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { CheckCircle2 } from 'lucide-react';

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
        <Modal open onClose={onClose} title={success ? undefined : 'Signaler ce contenu'}>
            <div className="space-y-4">
                {success ? (
                    <div className="text-center space-y-2 py-4">
                        <div className=""><CheckCircle2 className="w-9 h-9 text-ochre mx-auto" aria-hidden="true" /></div>
                        <p className="text-base font-semibold text-ink">Signalement envoyé.</p>
                        <p className="text-sm text-gray-600">Notre équipe va l'examiner rapidement.</p>
                        <Button className="w-full mt-2" onClick={onClose}>Fermer</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div className="space-y-1.5">
                            {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((r) => (
                                <label
                                    key={r}
                                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm cursor-pointer border transition-all ${
                                        reason === r ? 'border-brand bg-brand-tint' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        checked={reason === r}
                                        onChange={() => setReason(r)}
                                        className="accent-brand"
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
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-base focus:outline-none focus:border-ink focus:ring-2 focus:ring-brand resize-none"
                        />

                        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

                        <div className="flex gap-2">
                            <Button type="submit" isLoading={submitting} disabled={!reason} className="flex-1">
                                Envoyer
                            </Button>
                            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
};

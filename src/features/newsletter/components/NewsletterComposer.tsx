// src/features/newsletter/components/NewsletterComposer.tsx — Ça Parle
import { useState } from 'react';
import { newsletterService } from '../services/newsletterService';
import { RecipientPicker } from './RecipientPicker';
import { Button } from '@/components/ui/button';

type Mode = 'all' | 'manual';

export const NewsletterComposer = () => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [mode, setMode] = useState<Mode>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sendingTest, setSendingTest] = useState(false);
    const [sendingAll, setSendingAll] = useState(false);
    const [result, setResult] = useState<{ sent: number; failed: number; total: number; testOnly?: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const buildHtml = () =>
        body
            .split('\n')
            .map((line) => `<p>${line}</p>`)
            .join('');

    const canSend = subject.trim() && body.trim() && (mode === 'all' || selectedIds.size > 0);

    const handleTest = async () => {
        setSendingTest(true);
        setError(null);
        setResult(null);
        try {
            const res = await newsletterService.send(subject, buildHtml(), { testOnly: true });
            setResult(res);
        } catch (err: any) {
            setError(err.message || "Échec de l'envoi du test.");
        } finally {
            setSendingTest(false);
        }
    };

    const handleSend = async () => {
        setSendingAll(true);
        setError(null);
        setResult(null);
        try {
            const res = await newsletterService.send(subject, buildHtml(), {
                recipientIds: mode === 'manual' ? Array.from(selectedIds) : undefined,
            });
            setResult(res);
            setSubject('');
            setBody('');
            setSelectedIds(new Set());
        } catch (err: any) {
            setError(err.message || "Échec de l'envoi.");
        } finally {
            setSendingAll(false);
            setConfirmOpen(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-800">📧 Envoyer une newsletter</h2>

            <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet de l'email"
                maxLength={150}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
            />

            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Contenu du message..."
                rows={8}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40 resize-none"
            />

            {/* Choix des destinataires */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destinataires</label>
                <div className="flex gap-2 mb-3">
                    <button
                        type="button"
                        onClick={() => setMode('all')}
                        className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border transition-all ${
                            mode === 'all' ? 'border-[#FF4757] bg-[#FF4757]/5 text-[#FF4757]' : 'border-gray-200 text-gray-500'
                        }`}
                    >
                        Tous les utilisateurs abonnés
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('manual')}
                        className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium border transition-all ${
                            mode === 'manual' ? 'border-[#FF4757] bg-[#FF4757]/5 text-[#FF4757]' : 'border-gray-200 text-gray-500'
                        }`}
                    >
                        Sélection manuelle
                    </button>
                </div>

                {mode === 'manual' && (
                    <RecipientPicker selectedIds={selectedIds} onChange={setSelectedIds} />
                )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {result && (
                <p className="text-sm text-green-600">
                    {result.testOnly
                        ? '✅ Email de test envoyé — vérifie ta boîte mail.'
                        : `✅ Envoyé à ${result.sent} personnes sur ${result.total} (${result.failed} échec${result.failed !== 1 ? 's' : ''}).`}
                </p>
            )}

            <div className="flex flex-wrap gap-2">
                <Button
                    onClick={handleTest}
                    isLoading={sendingTest}
                    variant="secondary"
                    disabled={!subject.trim() || !body.trim()}
                >
                    🧪 M'envoyer un test
                </Button>

                {!confirmOpen ? (
                    <Button onClick={() => setConfirmOpen(true)} disabled={!canSend}>
                        {mode === 'all' ? 'Envoyer à tous les utilisateurs' : `Envoyer à ${selectedIds.size} personne${selectedIds.size > 1 ? 's' : ''}`}
                    </Button>
                ) : null}
            </div>

            {confirmOpen && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                    <p className="text-sm text-amber-800">
                        {mode === 'all'
                            ? <>Confirmer l'envoi à <strong>tous</strong> les utilisateurs abonnés ? Cette action est irréversible.</>
                            : <>Confirmer l'envoi à <strong>{selectedIds.size}</strong> personne{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''} ? Cette action est irréversible.</>}
                        {' '}Pense à faire d'abord "M'envoyer un test" si ce n'est pas déjà fait.
                    </p>
                    <div className="flex gap-2">
                        <Button onClick={handleSend} isLoading={sendingAll} variant="danger">
                            Oui, envoyer
                        </Button>
                        <Button onClick={() => setConfirmOpen(false)} variant="secondary">
                            Annuler
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

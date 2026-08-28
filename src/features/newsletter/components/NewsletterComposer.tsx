// src/features/newsletter/components/NewsletterComposer.tsx — Ça Parle
import { useState } from 'react';
import { newsletterService } from '../services/newsletterService';
import { Button } from '@/components/ui/button';

export const NewsletterComposer = () => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleSend = async () => {
        setSending(true);
        setError(null);
        setResult(null);
        try {
            // Le contenu est envoyé tel quel comme HTML (retours à la ligne
            // convertis en <br> pour un rendu simple sans avoir à écrire
            // du HTML à la main).
            const html = body
                .split('\n')
                .map((line) => `<p>${line}</p>`)
                .join('');
            const res = await newsletterService.send(subject, html);
            setResult(res);
            setSubject('');
            setBody('');
        } catch (err: any) {
            setError(err.message || "Échec de l'envoi.");
        } finally {
            setSending(false);
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

            {error && <p className="text-sm text-red-500">{error}</p>}

            {result && (
                <p className="text-sm text-green-600">
                    ✅ Envoyé à {result.sent} personnes sur {result.total} ({result.failed} échec{result.failed !== 1 ? 's' : ''}).
                </p>
            )}

            {!confirmOpen ? (
                <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={!subject.trim() || !body.trim()}
                >
                    Envoyer à tous les utilisateurs
                </Button>
            ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                    <p className="text-sm text-amber-800">
                        Confirmer l'envoi à <strong>tous</strong> les utilisateurs abonnés ? Cette action est irréversible.
                    </p>
                    <div className="flex gap-2">
                        <Button onClick={handleSend} isLoading={sending} variant="danger">
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
// src/features/vanessa/components/SuggestExpressionModal.tsx — Vanessa
import { useState } from 'react';
import { vanessaKnowledgeService } from '../services/vanessaKnowledgeService';
import { Button } from '@/components/ui/button';

interface Props {
    onClose: () => void;
}

export const SuggestExpressionModal = ({ onClose }: Props) => {
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (content.trim().length < 5) return;
        setSaving(true);
        setError(null);
        try {
            await vanessaKnowledgeService.suggestExpression(content.trim());
            setDone(true);
        } catch (err: any) {
            setError(err.message || "Impossible d'envoyer ta proposition, réessaie.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-4 md:pb-0">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4">
                {done ? (
                    <div className="text-center space-y-3 py-4">
                        
                        <p className="text-sm font-semibold text-gray-800">Merci, c'est transmis !</p>
                        <p className="text-xs text-gray-500">
                            Toute l'équipe de Vanessa lira ta proposition et en tiendra compte.
                        </p>
                        <Button onClick={onClose} className="w-full">Fermer</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Proposer une expression à Vanessa</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Une expression, une idée, un domaine où elle devrait évoluer, ce que tu attends d'elle…
                                dis-nous tout, librement.
                            </p>
                        </div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Ex : « Ça va aller » pour rassurer quelqu'un… ou : j'aimerais que Vanessa m'aide pour les démarches administratives."
                            maxLength={2000}
                            rows={8}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                        />
                        <p className="text-xs text-gray-300 text-right">{content.length}/2000</p>
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        <div className="flex gap-2">
                            <Button type="submit" isLoading={saving} disabled={content.trim().length < 5} className="flex-1">
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
// src/features/predictions/components/CreatePredictionForm.tsx — Vanessa
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
    onSubmit: (question: string, options: string[]) => Promise<void>;
}

export const CreatePredictionForm = ({ onSubmit }: Props) => {
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateOption = (index: number, value: string) => {
        setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
    };

    const addOption = () => {
        if (options.length >= 5) return;
        setOptions((prev) => [...prev, '']);
    };

    const removeOption = (index: number) => {
        if (options.length <= 2) return;
        setOptions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
        if (!question.trim() || cleanOptions.length < 2) {
            setError('Une question et au moins 2 options sont nécessaires.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit(question, cleanOptions);
            setQuestion('');
            setOptions(['', '']);
            setOpen(false);
        } catch {
            setError('Impossible de créer la prédiction.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="text-sm text-[#FF4757] font-medium hover:underline"
            >
                🔮 Lancer une prédiction sur cette histoire
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-3">
            <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Que va-t-il se passer ensuite ?"
                maxLength={200}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
            />

            <div className="space-y-2">
                {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                        <input
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            maxLength={100}
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                        />
                        {options.length > 2 && (
                            <button type="button" onClick={() => removeOption(index)} className="text-gray-400 hover:text-red-500 px-2">
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {options.length < 5 && (
                <button type="button" onClick={addOption} className="text-xs text-gray-500 hover:text-gray-700">
                    + Ajouter une option
                </button>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2">
                <Button type="submit" size="sm" isLoading={submitting}>Publier</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
            </div>
        </form>
    );
};

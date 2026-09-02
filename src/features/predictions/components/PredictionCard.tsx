// src/features/predictions/components/PredictionCard.tsx — Ça Parle
import { useState, useEffect, useCallback } from 'react';
import { predictionService, type Prediction } from '../services/predictionService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface Props {
    prediction: Prediction;
    isStoryAuthor: boolean;
}

export const PredictionCard = ({ prediction, isStoryAuthor }: Props) => {
    const { user } = useAuth();
    const [counts, setCounts] = useState<number[] | null>(null);
    const [userVoteIndex, setUserVoteIndex] = useState<number | null>(null);
    const [voting, setVoting] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [showResolvePicker, setShowResolvePicker] = useState(false);

    const isResolved = prediction.status === 'resolue';
    const total = counts ? counts.reduce((a, b) => a + b, 0) : 0;

    const load = useCallback(async () => {
        const [c, mine] = await Promise.all([
            predictionService.getVoteCounts(prediction.$id, prediction.options.length),
            user ? predictionService.getUserVote(prediction.$id, user.$id) : Promise.resolve(null),
        ]);
        setCounts(c);
        setUserVoteIndex(mine?.optionIndex ?? null);
    }, [prediction.$id, prediction.options.length, user]);

    useEffect(() => {
        load();
    }, [load]);

    const handleVote = async (index: number) => {
        if (!user || voting || userVoteIndex !== null || isResolved) return;
        setVoting(true);
        try {
            await predictionService.vote(prediction.$id, user.$id, index);
            setUserVoteIndex(index);
            await load();
        } finally {
            setVoting(false);
        }
    };

    const handleResolve = async (correctIndex: number) => {
        setResolving(true);
        try {
            await predictionService.resolve(prediction.$id, correctIndex);
            setShowResolvePicker(false);
            await load();
        } catch (err: any) {
            alert(err.message || 'Impossible de résoudre cette prédiction.');
        } finally {
            setResolving(false);
        }
    };

    return (
        <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">🔮 {prediction.question}</p>

            <div className="space-y-2">
                {prediction.options.map((option, index) => {
                    const count = counts?.[index] || 0;
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                    const isMine = userVoteIndex === index;
                    const isCorrect = isResolved && prediction.correctOptionIndex === index;
                    const hasVotedOrResolved = userVoteIndex !== null || isResolved;

                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleVote(index)}
                            disabled={hasVotedOrResolved || voting}
                            className={`relative w-full text-left rounded-xl px-3 py-2.5 text-sm overflow-hidden transition-all disabled:cursor-default ${
                                isCorrect
                                    ? 'ring-2 ring-green-400 bg-green-50'
                                    : isMine
                                        ? 'ring-2 ring-[#FF4757]/50 bg-white'
                                        : 'bg-white hover:bg-gray-50 border border-gray-100'
                            }`}
                        >
                            {hasVotedOrResolved && (
                                <div
                                    className="absolute inset-y-0 left-0 bg-purple-100/60"
                                    style={{ width: `${percent}%` }}
                                />
                            )}
                            <div className="relative flex items-center justify-between">
                                <span className="text-gray-700">
                                    {isCorrect && '✅ '}{option}
                                </span>
                                {hasVotedOrResolved && (
                                    <span className="text-xs text-gray-400">{percent}% · {count}</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {isResolved ? (
                <p className="text-xs text-green-600 font-medium">✅ Résultat connu</p>
            ) : (
                <p className="text-xs text-gray-400">{total} vote{total > 1 ? 's' : ''}</p>
            )}

            {isStoryAuthor && !isResolved && (
                <div className="pt-2 border-t border-purple-100">
                    {!showResolvePicker ? (
                        <button
                            onClick={() => setShowResolvePicker(true)}
                            className="text-xs text-[#FF4757] font-medium hover:underline"
                        >
                            Marquer comme résolue
                        </button>
                    ) : (
                        <div className="space-y-1.5">
                            <p className="text-xs text-gray-500">Quelle option s'est réalisée ?</p>
                            <div className="flex flex-wrap gap-1.5">
                                {prediction.options.map((option, index) => (
                                    <Button
                                        key={index}
                                        size="sm"
                                        variant="secondary"
                                        isLoading={resolving}
                                        onClick={() => handleResolve(index)}
                                    >
                                        {option}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

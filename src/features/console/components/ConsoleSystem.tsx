// src/features/console/components/ConsoleSystem.tsx — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { platformService, timeAgo, type FunctionHealth } from '../services/platformService';

export const ConsoleSystem = () => {
    const [functions, setFunctions] = useState<FunctionHealth[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await platformService.system();
            setFunctions(r.functions);
            setUpdatedAt(r.generatedAt);
        } catch (e: any) {
            setError(e.message || 'Impossible de lire la santé des Functions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const withProblems = functions.filter((f) => (f.problemCount ?? 0) > 0).length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                    {updatedAt ? `Mis à jour ${timeAgo(updatedAt)} — ` : ''}
                    {loading ? '' : withProblems === 0 ? 'aucun plantage sur 24 h' : `${withProblems} Function(s) avec des plantages sur 24 h`}
                </p>
                <button onClick={load} disabled={loading} className="text-xs font-semibold text-[#FF4757] disabled:opacity-50">
                    {loading ? 'Analyse...' : 'Actualiser'}
                </button>
            </div>

            <p className="text-xs text-gray-400 bg-white rounded-2xl border border-gray-100 p-3">
                Cette vue montre les plantages, délais dépassés et erreurs 5xx. Une Function qui échoue tout en
                répondant « succès » (par exemple Vanessa qui n'a pas pu répondre) n'apparaît pas ici : regarde le Journal.
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {loading && functions.length === 0 && <p className="text-sm text-gray-400 text-center py-10">Analyse des Functions...</p>}

            <div className="space-y-2">
                {functions.map((f) => {
                    const bad = (f.problemCount ?? 0) > 0;
                    return (
                        <div key={f.id} className={`rounded-2xl border p-4 ${bad ? 'bg-red-50/50 border-red-100' : 'bg-white border-gray-100'}`}>
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-gray-800">{f.name}</p>
                                <div className="flex items-center gap-3 text-[11px] text-gray-400 shrink-0">
                                    {f.timeout !== undefined && <span>timeout {f.timeout} s</span>}
                                    <span>{f.total24h ?? 0} exéc. / 24 h</span>
                                    {bad
                                        ? <span className="font-bold text-red-600">{f.problemCount} problème(s)</span>
                                        : <span className="text-green-600 font-semibold">ok</span>}
                                </div>
                            </div>
                            {f.error && <p className="text-xs text-amber-600 mt-1">Lecture impossible : {f.error}</p>}
                            {f.lastProblem && (
                                <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                                    <p>
                                        Dernier problème {timeAgo(f.lastProblem.at)} — statut {f.lastProblem.status}
                                        {f.lastProblem.statusCode ? ` (${f.lastProblem.statusCode})` : ''}, durée {f.lastProblem.durationSeconds} s
                                    </p>
                                    {f.lastProblem.error && <p className="font-mono text-[11px] text-red-600 break-words">{f.lastProblem.error}</p>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
// src/features/console/components/ConsoleAgents.tsx — Vanessa
// Évolution de chaque agent commercial, en lecture seule.
import { useEffect, useState } from 'react';
import { communityService, type AgentReport, type AgentSummary } from '@/features/community/communityService';
import { AgentDashboard } from '@/features/community/AgentDashboard';

export const ConsoleAgents = () => {
    const [agents, setAgents] = useState<AgentSummary[] | null>(null);
    const [open, setOpen] = useState<AgentSummary | null>(null);
    const [report, setReport] = useState<AgentReport | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        communityService.agentsOverview()
            .then((r) => setAgents(r.agents))
            .catch((err) => setError(err.message || 'Chargement impossible.'));
    }, []);

    const show = async (a: AgentSummary) => {
        setOpen(a);
        setReport(null);
        setError(null);
        try {
            setReport(await communityService.reportOf(a.id));
        } catch (err: any) {
            setError(err.message || 'Chargement impossible.');
        }
    };

    if (open) {
        return (
            <div className="space-y-3">
                <button onClick={() => { setOpen(null); setReport(null); }} className="text-xs font-semibold text-ochre">← Retour aux agents</button>
                <p className="font-bold text-gray-800">{open.name || 'Agent'} <span className="text-xs font-normal text-gray-400">{open.email}</span></p>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {!report && !error && <p className="text-sm text-gray-400">Chargement...</p>}
                {report && <AgentDashboard report={report} />}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-gray-400">
                Pour nommer un agent : dans la collection « users », mets l'attribut « isAgent » à true sur son compte.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!agents && !error && <p className="text-sm text-gray-400">Chargement...</p>}
            {agents && agents.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400">Aucun agent nommé pour l'instant.</div>
            )}
            {agents?.map((a) => (
                <button key={a.id} onClick={() => show(a)} className="w-full text-left bg-white rounded-2xl border border-gray-100 p-3.5 hover:border-brand">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{a.name || 'Sans nom'}</p>
                            <p className="text-xs text-gray-400 truncate">{a.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-ink">{a.registered}</p>
                            <p className="text-xs text-gray-400">inscrit(s)</p>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
};

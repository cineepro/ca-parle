// src/features/console/components/ConsoleOverview.tsx — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { platformService, timeAgo, type Overview } from '../services/platformService';
import { useAlertSummary } from '../hooks/useAlertSummary';

interface Props {
    onNavigate: (section: string) => void;
}

function Metric({ label, value }: { label: string; value: number | null | undefined }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
        </div>
    );
}

function Queue({ label, value, onClick }: { label: string; value: number | null | undefined; onClick: () => void }) {
    const has = !!value && value > 0;
    return (
        <button
            onClick={onClick}
            className={`text-left rounded-2xl border p-4 transition-colors ${
                has ? 'bg-[#FFF0F1] border-[#FF4757]/20 hover:bg-[#FFE6E8]' : 'bg-white border-gray-100 hover:bg-gray-50'
            }`}
        >
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${has ? 'text-[#FF4757]' : 'text-gray-800'}`}>{value ?? '—'}</p>
        </button>
    );
}

export const ConsoleOverview = ({ onNavigate }: Props) => {
    const alertSummary = useAlertSummary(true);
    const [data, setData] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await platformService.overview());
        } catch (e: any) {
            setError(e.message || "Impossible de charger la vue d'ensemble.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading && !data) return <p className="text-sm text-gray-400 text-center py-10">Chargement...</p>;
    if (error) return <p className="text-sm text-red-500 text-center py-10">{error}</p>;
    if (!data) return null;

    const m = data.metrics;
    const ev = data.eventSummary;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Mis à jour {timeAgo(data.generatedAt)}</p>
                <button onClick={load} disabled={loading} className="text-xs font-semibold text-[#FF4757] disabled:opacity-50">
                    {loading ? 'Actualisation...' : 'Actualiser'}
                </button>
            </div>

            {alertSummary.open > 0 && (
                <button
                    onClick={() => onNavigate('alerts')}
                    className={`w-full text-left rounded-2xl border p-4 flex items-center justify-between ${
                        alertSummary.critical > 0 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                    }`}
                >
                    <span className={`text-sm font-semibold ${alertSummary.critical > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                        {alertSummary.open} alerte(s) ouverte(s){alertSummary.critical > 0 ? `, dont ${alertSummary.critical} critique(s)` : ''}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">Voir</span>
                </button>
            )}

            <section>
                <h2 className="text-sm font-bold text-gray-800 mb-2">À traiter</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Queue label="Signalements en attente" value={m.reportsPending} onClick={() => onNavigate('signalements')} />
                    <Queue label="Contributions Ça sert" value={m.contributionsPending} onClick={() => onNavigate('ca-sert')} />
                    <Queue label="Expressions proposées" value={m.lexiconPending} onClick={() => onNavigate('connaissances')} />
                </div>
            </section>

            <section>
                <h2 className="text-sm font-bold text-gray-800 mb-2">Incidents, 24 dernières heures</h2>
                {ev === null ? (
                    <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-4">
                        Le journal n'est pas encore branché (collection <code>app_events</code> à créer).
                    </p>
                ) : (
                    <button
                        onClick={() => onNavigate('journal')}
                        className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 hover:bg-gray-50 flex items-center gap-6"
                    >
                        <div><p className="text-xs text-gray-400">Critiques</p><p className={`text-2xl font-bold ${ev.critical ? 'text-red-600' : 'text-gray-800'}`}>{ev.critical}</p></div>
                        <div><p className="text-xs text-gray-400">Attention</p><p className={`text-2xl font-bold ${ev.warning ? 'text-amber-600' : 'text-gray-800'}`}>{ev.warning}</p></div>
                        <div><p className="text-xs text-gray-400">Infos</p><p className="text-2xl font-bold text-gray-800">{ev.info}</p></div>
                        {ev.byType.length > 0 && (
                            <p className="text-xs text-gray-400 ml-auto hidden sm:block">
                                {ev.byType.map((t) => `${t.type} ×${t.count}`).join(' · ')}
                            </p>
                        )}
                    </button>
                )}
            </section>

            <section>
                <h2 className="text-sm font-bold text-gray-800 mb-2">Activité, 24 dernières heures</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Metric label="Nouveaux inscrits" value={m.usersNew24h} />
                    <Metric label="Messages échangés" value={m.messagesNew24h} />
                    <Metric label="Réponses de Vanessa" value={m.vanessaMessages24h} />
                    <Metric label="Histoires publiées" value={m.storiesNew24h} />
                    <Metric label="Commentaires" value={m.commentsNew24h} />
                    <Metric label="Inscrits au total" value={m.usersTotal} />
                </div>
            </section>

            <section>
                <h2 className="text-sm font-bold text-gray-800 mb-1">Comptes modérateurs</h2>
                <p className="text-xs text-gray-400 mb-2">Si un nom ne te dit rien, c'est un signal d'alarme à vérifier tout de suite.</p>
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    {data.moderators.length === 0 ? (
                        <p className="p-4 text-sm text-gray-400">Aucun.</p>
                    ) : data.moderators.map((u) => (
                        <div key={u.id} className="px-4 py-2.5 flex items-center justify-between">
                            <span className="text-sm text-gray-700">{u.name}</span>
                            <span className="text-[11px] text-gray-300 font-mono">{u.id.slice(0, 8)}</span>
                        </div>
                    ))}
                </div>
            </section>

            {data.unavailable.length > 0 && (
                <section className="bg-amber-50 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Certains chiffres sont indisponibles</p>
                    <ul className="text-xs text-amber-700 space-y-0.5">
                        {data.unavailable.map((u) => (
                            <li key={u.metric}><span className="font-mono">{u.metric}</span> — {u.reason}</li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
};
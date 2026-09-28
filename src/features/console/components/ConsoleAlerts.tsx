// src/features/console/components/ConsoleAlerts.tsx — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { platformService, timeAgo, type PlatformAlert, type Severity } from '../services/platformService';

const SEVERITY_STYLE: Record<Severity, string> = {
    critical: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    info: 'bg-blue-50 text-blue-600',
};
const SEVERITY_LABEL: Record<Severity, string> = { critical: 'Critique', warning: 'Attention', info: 'Info' };

function AlertCard({ alert, onAcknowledge, busy }: { alert: PlatformAlert; onAcknowledge?: () => void; busy?: boolean }) {
    const muted = alert.status !== 'open';
    return (
        <div className={`rounded-2xl border p-4 ${muted ? 'bg-white border-gray-100' : alert.severity === 'critical' ? 'bg-red-50/50 border-red-100' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start gap-3">
                <span className={`text-[10px] font-bold rounded px-2 py-0.5 shrink-0 mt-0.5 ${SEVERITY_STYLE[alert.severity]}`}>
                    {SEVERITY_LABEL[alert.severity]}
                </span>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${muted ? 'text-gray-500' : 'text-gray-800'}`}>{alert.title}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{alert.details}</p>
                    <p className="text-[11px] text-gray-400 mt-2">
                        Ouverte {timeAgo(alert.firstSeenAt)} · vue {alert.occurrences} fois
                        {alert.status === 'acknowledged' && alert.acknowledgedBy ? ` · prise en compte par ${alert.acknowledgedBy}` : ''}
                        {alert.status === 'resolved' && alert.resolvedAt ? ` · résolue ${timeAgo(alert.resolvedAt)}` : ''}
                    </p>
                </div>
                {onAcknowledge && (
                    <button
                        onClick={onAcknowledge}
                        disabled={busy}
                        className="shrink-0 text-xs font-semibold text-[#FF4757] bg-[#FF4757]/5 hover:bg-[#FF4757]/10 rounded-full px-3 py-1.5 disabled:opacity-50"
                    >
                        Prendre en compte
                    </button>
                )}
            </div>
        </div>
    );
}

export const ConsoleAlerts = () => {
    const [alerts, setAlerts] = useState<PlatformAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastRun, setLastRun] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setAlerts((await platformService.alerts()).alerts);
        } catch (e: any) {
            setError(e.message || 'Impossible de charger les alertes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const runNow = async () => {
        setChecking(true);
        setError(null);
        try {
            const r = await platformService.runCheck();
            setLastRun(`${r.created} nouvelle(s) alerte(s), ${r.resolved} résolue(s)`);
            await load();
        } catch (e: any) {
            setError(e.message || 'La vérification a échoué.');
        } finally {
            setChecking(false);
        }
    };

    const acknowledge = async (id: string) => {
        setBusyId(id);
        try {
            await platformService.acknowledgeAlert(id);
            await load();
        } finally {
            setBusyId(null);
        }
    };

    const open = alerts.filter((a) => a.status === 'open');
    const acknowledged = alerts.filter((a) => a.status === 'acknowledged');
    const resolved = alerts.filter((a) => a.status === 'resolved');

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-gray-400">
                    Vérification automatique toutes les 15 minutes.{lastRun ? ` Dernier essai manuel : ${lastRun}.` : ''}
                </p>
                <button
                    onClick={runNow}
                    disabled={checking}
                    className="text-xs font-semibold text-white bg-[#FF4757] hover:bg-[#e63e4d] rounded-full px-4 py-2 disabled:opacity-50"
                >
                    {checking ? 'Vérification...' : 'Vérifier maintenant'}
                </button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {loading && alerts.length === 0 && <p className="text-sm text-gray-400 text-center py-10">Chargement...</p>}

            {!loading && !error && open.length === 0 && (
                <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-6 text-center">
                    Aucune alerte ouverte.
                </p>
            )}

            {open.length > 0 && (
                <section className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-800">À traiter ({open.length})</h3>
                    {open.map((a) => <AlertCard key={a.id} alert={a} busy={busyId === a.id} onAcknowledge={() => acknowledge(a.id)} />)}
                </section>
            )}

            {acknowledged.length > 0 && (
                <section className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-800">Prises en compte, toujours actives ({acknowledged.length})</h3>
                    {acknowledged.map((a) => <AlertCard key={a.id} alert={a} />)}
                </section>
            )}

            {resolved.length > 0 && (
                <section className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-800">Résolues récemment</h3>
                    {resolved.map((a) => <AlertCard key={a.id} alert={a} />)}
                </section>
            )}
        </div>
    );
};
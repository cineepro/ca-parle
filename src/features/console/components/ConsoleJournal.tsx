// src/features/console/components/ConsoleJournal.tsx — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { platformService, timeAgo, type PlatformEvent, type Severity } from '../services/platformService';

const SEVERITY_STYLE: Record<Severity, string> = {
    critical: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    info: 'bg-sand text-brun',
};
const SEVERITY_LABEL: Record<Severity, string> = { critical: 'Critique', warning: 'Attention', info: 'Info' };

export const ConsoleJournal = () => {
    const [filter, setFilter] = useState<Severity | 'all'>('all');
    const [events, setEvents] = useState<PlatformEvent[]>([]);
    const [notConfigured, setNotConfigured] = useState(false);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await platformService.events(filter === 'all' ? undefined : filter);
            setEvents(r.events);
            setNotConfigured(!!r.notConfigured);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`text-xs font-semibold rounded-full px-3.5 py-1.5 ${filter === f ? 'bg-brand text-ink' : 'bg-gray-100 text-gray-500'}`}
                    >
                        {f === 'all' ? 'Tout' : SEVERITY_LABEL[f]}
                    </button>
                ))}
                <button onClick={load} className="ml-auto text-xs font-semibold text-ochre">Actualiser</button>
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 text-center py-10">Chargement...</p>
            ) : notConfigured ? (
                <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-6">
                    Le journal n'est pas encore branché : crée la collection <code>app_events</code> et renseigne
                    <code> COLLECTION_APP_EVENTS</code> sur les Functions.
                </p>
            ) : events.length === 0 ? (
                <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    Aucun incident enregistré. C'est plutôt bon signe.
                </p>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    {events.map((e) => (
                        <button key={e.id} onClick={() => setOpenId(openId === e.id ? null : e.id)} className="w-full text-left px-4 py-3 hover:bg-gray-50">
                            <div className="flex items-center gap-2.5">
                                <span className={`text-xs font-bold rounded px-2 py-0.5 shrink-0 ${SEVERITY_STYLE[e.severity]}`}>
                                    {SEVERITY_LABEL[e.severity] ?? e.severity}
                                </span>
                                <span className="text-xs font-mono text-gray-500 shrink-0">{e.type}</span>
                                <span className="text-sm text-gray-700 truncate flex-1">{e.message}</span>
                                <span className="text-xs text-gray-400 shrink-0">{timeAgo(e.createdAt)}</span>
                            </div>
                            {openId === e.id && (
                                <div className="mt-2 text-xs text-gray-500 space-y-1">
                                    <p><span className="font-semibold">Message :</span> {e.message}</p>
                                    <p><span className="font-semibold">Source :</span> {e.source}</p>
                                    <p><span className="font-semibold">Date :</span> {new Date(e.createdAt).toLocaleString('fr-FR')}</p>
                                    {Object.keys(e.meta).length > 0 && (
                                        <p><span className="font-semibold">Détails :</span> <span className="font-mono">{JSON.stringify(e.meta)}</span></p>
                                    )}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
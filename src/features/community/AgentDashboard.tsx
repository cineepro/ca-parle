// src/features/community/AgentDashboard.tsx — Vanessa
// Tableau de suivi d'un agent : chiffres, comptes enregistrés, propositions.
// Utilisé par la page de l'agent (avec saisie) et par la Console (lecture seule).
import { useState } from 'react';
import type { AgentReport } from './communityService';

const fmt = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const Stat = ({ label, value }: { label: string; value: number }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-3.5">
        <p className="text-2xl font-bold text-ink">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
);

interface Props {
    report: AgentReport;
    /** Si fourni, un bouton « Retirer » apparaît sur chaque compte (erreur de saisie). */
    onUnregister?: (userId: string) => void;
}

export const AgentDashboard = ({ report, onUnregister }: Props) => {
    const [tab, setTab] = useState<'accounts' | 'suggestions'>('accounts');
    const { totals, accounts, suggestions } = report;
    const pct = totals.registered ? Math.round((totals.active / totals.registered) * 100) : 0;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <Stat label="Comptes enregistrés" value={totals.registered} />
                <Stat label="Comptes actifs" value={totals.active} />
                <Stat label="Ont fait une proposition" value={totals.withSuggestion} />
                <Stat label="Propositions reçues" value={totals.suggestions} />
            </div>
            {totals.registered > 0 && (
                <p className="text-xs text-gray-500">
                    {pct} % des comptes enregistrés ont déjà fait quelque chose sur Vanessa (proposition, publication ou commentaire).
                </p>
            )}
            {report.truncated && <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3">Seuls les 500 comptes les plus récents sont affichés.</p>}

            <div className="flex gap-1">
                {([['accounts', `Comptes (${accounts.length})`], ['suggestions', `Propositions (${suggestions.length})`]] as const).map(([id, label]) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${tab === id ? 'bg-brand text-ink' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'accounts' && (
                accounts.length === 0
                    ? <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400">Aucun compte enregistré pour l'instant.</div>
                    : <div className="space-y-2">
                        {accounts.map((a) => (
                            <div key={a.userId} className="bg-white rounded-2xl border border-gray-100 p-3.5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {a.name || 'Sans nom'}
                                            <span className={`ml-2 text-xs font-semibold rounded-full px-2 py-0.5 ${a.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {a.active ? 'Actif' : 'Pas encore actif'}
                                            </span>
                                        </p>
                                        <p className="text-xs text-gray-500 break-all">{a.email}</p>
                                        <p className="text-xs text-gray-500">{a.phone ? `Tél. ${a.phone}` : 'Pas de numéro'}</p>
                                    </div>
                                    {onUnregister && (
                                        <button
                                            onClick={() => { if (window.confirm(`Retirer ${a.name || a.email} de ta liste ?`)) onUnregister(a.userId); }}
                                            className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                                        >
                                            Retirer
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Enregistré le {fmt(a.registeredAt)} · {a.suggestionsCount} proposition(s) · {a.stories} publication(s) · {a.comments} commentaire(s)
                                </p>
                            </div>
                        ))}
                    </div>
            )}

            {tab === 'suggestions' && (
                suggestions.length === 0
                    ? <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400">Aucune proposition pour l'instant.</div>
                    : <div className="space-y-2">
                        {suggestions.map((s) => (
                            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-3.5">
                                <p className="text-xs text-gray-400 mb-1">{s.name || 'Sans nom'} · {fmt(s.createdAt)}</p>
                                <p className="text-sm text-gray-800 whitespace-pre-line break-words">{s.content}</p>
                            </div>
                        ))}
                    </div>
            )}
        </div>
    );
};

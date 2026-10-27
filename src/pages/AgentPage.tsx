// src/pages/AgentPage.tsx — Vanessa
// Espace de l'agent commercial (#construisonsVanessa). L'agent enregistre les
// personnes qu'il a inscrites en tapant leur e-mail EN ENTIER : aucune
// suggestion n'est proposée, et le serveur vérifie qu'un compte existe.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { communityService, type AgentReport } from '@/features/community/communityService';
import { AgentDashboard } from '@/features/community/AgentDashboard';

export default function AgentPage() {
    const [report, setReport] = useState<AgentReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(async () => {
        try {
            setReport(await communityService.agentReport());
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Impossible de charger ton suivi.');
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const register = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || saving) return;
        setSaving(true);
        setMessage(null);
        try {
            const r = await communityService.agentRegister(email);
            setMessage({ ok: true, text: `${r.account.name || 'Compte'} enregistré.` });
            setEmail('');
            await load();
        } catch (err: any) {
            setMessage({ ok: false, text: err.message || 'Enregistrement impossible.' });
        } finally {
            setSaving(false);
        }
    };

    const unregister = async (userId: string) => {
        try {
            await communityService.agentUnregister(userId);
            await load();
        } catch (err: any) {
            setMessage({ ok: false, text: err.message || 'Impossible de retirer ce compte.' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-5">
                <div className="flex items-center gap-3">
                    <Link to="/accueil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Mon suivi #construisonsVanessa</h1>
                        <p className="text-xs text-gray-400">Les comptes que tu as fait inscrire et leurs propositions.</p>
                    </div>
                </div>

                <form onSubmit={register} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                    <label htmlFor="agent-email" className="text-sm font-semibold text-gray-800">Enregistrer une personne inscrite</label>
                    <p className="text-xs text-gray-400">Demande-lui son e-mail et écris-le en entier, exactement comme à l'inscription.</p>
                    <div className="flex gap-2">
                        <input
                            id="agent-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            name="agent-lookup-email"
                            placeholder="nom@gmail.com"
                            className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                        />
                        <button
                            type="submit"
                            disabled={saving || !email.trim()}
                            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
                        >
                            {saving ? '...' : 'Enregistrer'}
                        </button>
                    </div>
                    {message && <p className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-500'}`}>{message.text}</p>}
                </form>

                {error && <p className="text-sm text-red-500">{error}</p>}
                {!report && !error && <p className="text-sm text-gray-400">Chargement...</p>}
                {report && <AgentDashboard report={report} onUnregister={unregister} />}
            </div>
        </div>
    );
}

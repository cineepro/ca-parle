// src/features/console/components/ConsoleZemStats.tsx — Zem
// Ce que les gens cherchent et ouvrent : de quoi décider quels sites ou fiches ajouter. Anonyme.
import { useEffect, useState } from 'react';
import { moteurService, type ZemClicked, type ZemQueryStat } from '@/features/moteur/services/moteurService';

export const ConsoleZemStats = () => {
    const [clicked, setClicked] = useState<ZemClicked[] | null>(null);
    const [queries, setQueries] = useState<{ queries: ZemQueryStat[]; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        moteurService.topQueries().then(setQueries).catch((e) => setError(e.message));
        moteurService.topClicked().then(setClicked).catch((e) => { setClicked([]); setError((p) => p || e.message); });
    }, []);

    return (
        <div className="space-y-4">
            {error && <p className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-700">{error}</p>}
            <section className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-bold text-ink">Les recherches les plus fréquentes</h3>
                <p className="text-xs text-gray-400 mb-2">Sur les {queries?.total ?? '…'} dernières recherches. « Sans résultat » = idée de site ou de fiche à ajouter.</p>
                {queries?.queries.length === 0 && <p className="text-sm text-gray-500">Aucune recherche pour le moment.</p>}
                <ul className="divide-y divide-gray-50">
                    {queries?.queries.map((q) => (
                        <li key={q.q} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                            <span className="text-ink break-words min-w-0">{q.q}</span>
                            <span className="shrink-0 text-gray-500">{q.count}×{q.empty > 0 && <span className="ml-2 text-red-700 font-semibold">{q.empty} sans résultat</span>}</span>
                        </li>
                    ))}
                </ul>
            </section>
            <section className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-bold text-ink">Les pages les plus ouvertes</h3>
                <p className="text-xs text-gray-400 mb-2">Les pages très ouvertes remontent un peu dans les résultats (bonus plafonné).</p>
                {clicked?.length === 0 && <p className="text-sm text-gray-500">Aucun clic enregistré pour le moment.</p>}
                <ul className="divide-y divide-gray-50">
                    {clicked?.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                            <span className="min-w-0"><span className="text-ink break-words">{c.title}</span><span className="block text-xs text-gray-400">{c.sourceLabel}</span></span>
                            <span className="shrink-0 text-gray-500">{c.clicks}×</span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

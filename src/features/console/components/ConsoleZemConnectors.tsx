// src/features/console/components/ConsoleZemConnectors.tsx — Zem
// Choisir quels connecteurs de Vanessa Zem peut aussi chercher. Seules les notes ACTIVES (déjà
// validées) des connecteurs cochés sont copiées. « Mon cahier » n'apparaît jamais ici.
import { useCallback, useEffect, useState } from 'react';
import { moteurService, type ZemCategory, type ZemConnectorIndex } from '@/features/moteur/services/moteurService';
import { CATEGORY_META, CATEGORY_ORDER } from '@/features/moteur/lib/phrases';

const ago = (iso?: string) => {
    if (!iso) return 'jamais';
    const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
    if (m < 1) return 'à l’instant';
    if (m < 60) return `il y a ${m} min`;
    if (m < 1440) return `il y a ${Math.floor(m / 60)} h`;
    return `il y a ${Math.floor(m / 1440)} j`;
};

export const ConsoleZemConnectors = () => {
    const [items, setItems] = useState<ZemConnectorIndex[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(async () => {
        try { setItems(await moteurService.listConnectorIndex()); }
        catch (e: any) { setItems([]); setMessage({ ok: false, text: e.message || 'Impossible de charger les connecteurs.' }); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const run = async (fn: () => Promise<string | void>) => {
        if (busy) return;
        setBusy(true);
        setMessage(null);
        try { const t = await fn(); if (t) setMessage({ ok: true, text: t }); await load(); }
        catch (e: any) { setMessage({ ok: false, text: e.message || 'Action impossible.' }); }
        finally { setBusy(false); }
    };

    const toggle = (c: ZemConnectorIndex) => run(async () => {
        if (c.enabled) {
            await moteurService.setConnectorIndex(c.id, false);
            return `« ${c.name} » n’est plus dans Zem.`;
        }
        await moteurService.setConnectorIndex(c.id, true, c.category, c.trust);
        const r = await moteurService.syncConnectors(c.id);
        return `« ${c.name} » est dans Zem : ${r.written} note(s) copiée(s).`;
    });

    const change = (c: ZemConnectorIndex, patch: { category?: ZemCategory; trust?: 1 | 2 | 3 }) => run(async () => {
        await moteurService.setConnectorIndex(c.id, true, patch.category ?? c.category, patch.trust ?? c.trust);
        await moteurService.syncConnectors(c.id);
    });

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                Zem peut aussi chercher dans les <strong>notes</strong> de certains connecteurs de Vanessa. Seules les notes <strong>activées</strong> sont copiées (jamais les brouillons), et seulement pour les connecteurs que tu coches ici. Une note désactivée ou supprimée disparaît de Zem à la synchronisation suivante. Cela n’utilise aucun jeton Claude.
            </p>
            {message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${message.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{message.text}</p>}
            {items === null && <p className="text-sm text-gray-400">Chargement…</p>}
            {items?.length === 0 && <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-4">Aucun connecteur.</p>}
            <div className="space-y-2">
                {items?.map((c) => (
                    <div key={c.id} className={`bg-white rounded-2xl border border-gray-100 p-3 ${c.active ? '' : 'opacity-70'}`}>
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-ink"><span aria-hidden>{c.icon}</span> {c.name}{!c.active && <span className="ml-2 text-xs font-normal text-gray-400">(connecteur inactif)</span>}</p>
                            <button disabled={busy} onClick={() => toggle(c)} aria-pressed={c.enabled}
                                className={`shrink-0 rounded-full px-4 min-h-[40px] text-sm font-bold ${c.enabled ? 'bg-brand text-ink' : 'bg-sand text-ink'}`}>
                                {c.enabled ? 'Dans Zem ✔' : 'Ajouter à Zem'}
                            </button>
                        </div>
                        {c.enabled && (
                            <>
                                <p className="text-xs text-gray-500 mt-1">{c.pagesCount} note(s) dans Zem · synchronisé {ago(c.lastCrawledAt)}{c.lastStatus ? ` · ${c.lastStatus}` : ''}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <select aria-label="Rubrique" disabled={busy} value={c.category} onChange={(e) => change(c, { category: e.target.value as ZemCategory })} className="rounded-lg border border-gray-200 text-xs px-2 min-h-[36px]">
                                        {CATEGORY_ORDER.map((k) => <option key={k} value={k}>{CATEGORY_META[k].label}</option>)}
                                    </select>
                                    <select aria-label="Confiance" disabled={busy} value={c.trust} onChange={(e) => change(c, { trust: Number(e.target.value) as 1 | 2 | 3 })} className="rounded-lg border border-gray-200 text-xs px-2 min-h-[36px]">
                                        <option value={3}>Confiance 3</option><option value={2}>Confiance 2</option><option value={1}>Confiance 1</option>
                                    </select>
                                    <button disabled={busy} onClick={() => run(async () => { const r = await moteurService.syncConnectors(c.id); return `Synchronisé : ${r.written} mise(s) à jour, ${r.removed} retirée(s).`; })} className="rounded-lg bg-sand text-ink text-xs font-semibold px-3 min-h-[36px]">Synchroniser maintenant</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-400">Pour une synchronisation automatique, programme la fonction « manage-search-sources » (voir le guide Zem).</p>
        </div>
    );
};

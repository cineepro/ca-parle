// src/features/console/components/ConsoleZem.tsx — Zem
// Console → Zem : choisir les sites que Zem lit. Ajout d'un site, ajout en vrac (une ligne par site),
// réglage de la confiance / rubrique / ville, pause, retrait, et liste des recherches sans résultat.
import { useCallback, useEffect, useState } from 'react';
import {
    moteurService, type ZemCategory, type ZemMissed, type ZemSource, type ZemStats,
} from '@/features/moteur/services/moteurService';
import { CATEGORY_META, CATEGORY_ORDER, TRUST_META } from '@/features/moteur/lib/phrases';

const BULK_EXAMPLE = `# adresse | nom | rubrique | ville | confiance (1 à 3)
https://www.uac.bj/news | UAC — actualités | etudes | Abomey-Calavi | 3
https://www.gouv.bj/actualites | Gouvernement | administration | | 3`;

const ago = (iso?: string) => {
    if (!iso) return 'jamais';
    const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
    if (m < 1) return 'à l’instant';
    if (m < 60) return `il y a ${m} min`;
    if (m < 1440) return `il y a ${Math.floor(m / 60)} h`;
    return `il y a ${Math.floor(m / 1440)} j`;
};

const input = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm min-h-[44px]';

export const ConsoleZem = () => {
    const [sources, setSources] = useState<ZemSource[] | null>(null);
    const [stats, setStats] = useState<ZemStats | null>(null);
    const [missed, setMissed] = useState<ZemMissed[] | null>(null);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ url: '', label: '', category: 'actualites' as ZemCategory, city: '', trust: 2 as 1 | 2 | 3, sitemapUrl: '', feedUrl: '' });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [bulk, setBulk] = useState('');

    const load = useCallback(async () => {
        try {
            const [s, st] = await Promise.all([moteurService.listSources(), moteurService.stats()]);
            setSources(s);
            setStats(st);
        } catch (e: any) {
            setSources([]);
            setMessage({ ok: false, text: e.message || 'Impossible de charger les sites.' });
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const wrap = async (fn: () => Promise<string | void>) => {
        if (busy) return;
        setBusy(true);
        setMessage(null);
        try {
            const text = await fn();
            if (text) setMessage({ ok: true, text });
            await load();
        } catch (e: any) {
            setMessage({ ok: false, text: e.message || 'Action impossible.' });
        } finally {
            setBusy(false);
        }
    };

    const add = (e: React.FormEvent) => {
        e.preventDefault();
        wrap(async () => {
            await moteurService.addSource({
                url: form.url.trim(), label: form.label.trim() || undefined, category: form.category,
                city: form.city.trim(), trust: form.trust,
                sitemapUrl: form.sitemapUrl.trim() || undefined, feedUrl: form.feedUrl.trim() || undefined,
            });
            setForm({ ...form, url: '', label: '', sitemapUrl: '', feedUrl: '' });
            return 'Site ajouté. Le robot le lira à son prochain passage.';
        });
    };

    const addBulk = () => wrap(async () => {
        const r = await moteurService.addMany(bulk);
        setBulk(r.skipped.length ? r.skipped.map((s) => `# ignoré (${s.reason}) : ${s.line}`).join('\n') : '');
        return `${r.added} site(s) ajouté(s)${r.skipped.length ? `, ${r.skipped.length} ignoré(s) — voir la liste dans la zone de texte` : ''}.`;
    });

    const remove = (s: ZemSource) => {
        if (!window.confirm(`Retirer « ${s.label} » et toutes ses pages de Zem ?`)) return;
        wrap(async () => { await moteurService.removeSource(s.$id); return 'Site retiré.'; });
    };

    const loadMissed = () => wrap(async () => { setMissed(await moteurService.missed()); });

    return (
        <div className="space-y-5">
            {/* Chiffres */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    {[
                        ['Sites', stats.sources], ['Actifs', stats.activeSources], ['Pages lues', stats.pages], ['Dernier passage', ago(stats.lastCrawledAt)],
                    ].map(([l, v]) => (
                        <div key={String(l)} className="bg-white rounded-2xl border border-gray-100 p-3">
                            <p className="text-lg font-extrabold text-ink">{v}</p>
                            <p className="text-xs text-gray-500">{l}</p>
                        </div>
                    ))}
                </div>
            )}

            {message && (
                <p role="status" className={`rounded-xl px-4 py-3 text-sm ${message.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{message.text}</p>
            )}

            {/* Ajouter un site */}
            <form onSubmit={add} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <h3 className="font-bold text-ink">Ajouter un site</h3>
                <label className="block text-sm">
                    <span className="text-gray-600">Adresse de départ <span className="text-gray-400">(la page ou la rubrique à lire)</span></span>
                    <input className={input} type="url" required placeholder="https://www.uac.bj/news" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block text-sm"><span className="text-gray-600">Nom court</span>
                        <input className={input} placeholder="UAC — actualités" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
                    <label className="block text-sm"><span className="text-gray-600">Ville <span className="text-gray-400">(facultatif)</span></span>
                        <input className={input} placeholder="Cotonou" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
                    <label className="block text-sm"><span className="text-gray-600">Rubrique</span>
                        <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ZemCategory })}>
                            {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>)}
                        </select></label>
                    <label className="block text-sm"><span className="text-gray-600">Confiance</span>
                        <select className={input} value={form.trust} onChange={(e) => setForm({ ...form, trust: Number(e.target.value) as 1 | 2 | 3 })}>
                            <option value={3}>3 — Officiel (université, ministère…)</option>
                            <option value={2}>2 — Fiable (média connu)</option>
                            <option value={1}>1 — À vérifier (blog, forum)</option>
                        </select></label>
                </div>
                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs font-semibold text-ochre">
                    {showAdvanced ? '− Masquer' : '+ Réglages avancés'} (plan du site, flux RSS)
                </button>
                {showAdvanced && (
                    <div className="grid sm:grid-cols-2 gap-3">
                        <label className="block text-sm"><span className="text-gray-600">Plan du site (sitemap.xml)</span>
                            <input className={input} type="url" placeholder="auto-détecté si vide" value={form.sitemapUrl} onChange={(e) => setForm({ ...form, sitemapUrl: e.target.value })} /></label>
                        <label className="block text-sm"><span className="text-gray-600">Flux RSS</span>
                            <input className={input} type="url" placeholder="auto-détecté si vide" value={form.feedUrl} onChange={(e) => setForm({ ...form, feedUrl: e.target.value })} /></label>
                    </div>
                )}
                <button disabled={busy || !form.url.trim()} className="rounded-full bg-brand text-ink font-bold px-5 min-h-[44px] disabled:opacity-50">Ajouter</button>
            </form>

            {/* Ajout en vrac */}
            <details className="bg-white rounded-2xl border border-gray-100 p-4">
                <summary className="font-bold text-ink cursor-pointer min-h-[44px] flex items-center">Ajouter plusieurs sites d’un coup</summary>
                <p className="text-xs text-gray-500 mt-2">Une ligne par site : <code>adresse | nom | rubrique | ville | confiance</code>. Tout sauf l’adresse est facultatif. Rubriques : {CATEGORY_ORDER.join(', ')}.</p>
                <textarea className={`${input} mt-2 font-mono min-h-[140px]`} placeholder={BULK_EXAMPLE} value={bulk} onChange={(e) => setBulk(e.target.value)} />
                <button onClick={addBulk} disabled={busy || !bulk.trim()} className="mt-2 rounded-full bg-brand text-ink font-bold px-5 min-h-[44px] disabled:opacity-50">Ajouter la liste</button>
            </details>

            {/* Liste */}
            <section>
                <h3 className="font-bold text-ink mb-2">Sites suivis {sources ? `(${sources.length})` : ''}</h3>
                {sources === null && <p className="text-sm text-gray-400">Chargement…</p>}
                {sources?.length === 0 && <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-4">Aucun site pour le moment. Ajoute le premier ci-dessus.</p>}
                <div className="space-y-2">
                    {sources?.map((s) => (
                        <div key={s.$id} className={`bg-white rounded-2xl border border-gray-100 p-3 ${s.active ? '' : 'opacity-60'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-semibold text-ink truncate">{s.label}</p>
                                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-ochre break-all">{s.url}</a>
                                </div>
                                <span className={`shrink-0 text-xs font-bold rounded-full px-2 py-0.5 ${TRUST_META[s.trust].className}`}>{TRUST_META[s.trust].label}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {CATEGORY_META[s.category]?.emoji} {CATEGORY_META[s.category]?.label}{s.city ? ` · 📍 ${s.city}` : ''} · {s.pagesCount ?? 0} page(s) · vu {ago(s.lastCrawledAt)}
                            </p>
                            {s.lastStatus && <p className="text-xs text-gray-400 mt-0.5 break-words">{s.lastStatus}</p>}
                            <div className="flex flex-wrap gap-2 mt-2">
                                <select aria-label="Confiance" disabled={busy} value={s.trust} onChange={(e) => wrap(async () => { await moteurService.updateSource(s.$id, { trust: Number(e.target.value) as 1 | 2 | 3 }); })} className="rounded-lg border border-gray-200 text-xs px-2 min-h-[36px]">
                                    <option value={3}>Confiance 3</option><option value={2}>Confiance 2</option><option value={1}>Confiance 1</option>
                                </select>
                                <select aria-label="Rubrique" disabled={busy} value={s.category} onChange={(e) => wrap(async () => { await moteurService.updateSource(s.$id, { category: e.target.value as ZemCategory }); })} className="rounded-lg border border-gray-200 text-xs px-2 min-h-[36px]">
                                    {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
                                </select>
                                <button disabled={busy} onClick={() => wrap(async () => { await moteurService.updateSource(s.$id, { active: !s.active }); })} className="rounded-lg bg-sand text-ink text-xs font-semibold px-3 min-h-[36px]">{s.active ? 'Mettre en pause' : 'Réactiver'}</button>
                                <button disabled={busy} onClick={() => remove(s)} className="rounded-lg text-red-700 text-xs font-semibold px-3 min-h-[36px] hover:bg-red-50">Retirer</button>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Un changement de rubrique ou de confiance s’applique aux pages au prochain passage du robot.</p>
            </section>

            {/* Recherches sans résultat */}
            <section className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-ink">Ce que les gens cherchent sans le trouver</h3>
                    <button onClick={loadMissed} disabled={busy} className="rounded-full bg-sand text-ink text-sm font-semibold px-4 min-h-[40px]">Voir</button>
                </div>
                {missed && (missed.length === 0
                    ? <p className="text-sm text-gray-500 mt-2">Rien pour le moment — ou aucune recherche n’a été faite.</p>
                    : <ul className="mt-2 divide-y divide-gray-50">{missed.map((m) => (
                        <li key={m.q} className="flex justify-between py-1.5 text-sm"><span className="text-ink">{m.q}</span><span className="text-gray-400">{m.count}×</span></li>
                    ))}</ul>)}
                <p className="text-xs text-gray-400 mt-2">Ce sont des idées de nouveaux sites à ajouter. Aucune identité n’est enregistrée avec ces recherches.</p>
            </section>
        </div>
    );
};

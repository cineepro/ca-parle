// src/features/console/components/ConsoleUac.tsx — Vanessa
// Espace UAC côté équipe : menu de la semaine de chaque restaurant (saisi UNE fois, il se répète chaque semaine),
// et modération des actualités publiées par les étudiants.
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DAYS, MEALS, NEWS_KINDS } from '@/features/uac/config';
import { dayLabel, emptyMenu } from '@/features/uac/lib/menu';
import { uacService, type UacNews, type UacRestaurant } from '@/features/uac/services/uacService';

const field = 'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-brand';
const blank = (order: number): UacRestaurant => ({ id: '', name: '', place: '', order, active: true, menu: emptyMenu() });

const RestaurantEditor = ({ initial, onSaved, onCancel }: { initial: UacRestaurant; onSaved: () => void; onCancel: () => void }) => {
    const [r, setR] = useState<UacRestaurant>(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setDish = (day: (typeof DAYS)[number], meal: string, v: string) =>
        setR((p) => ({ ...p, menu: { ...p.menu, [day]: { ...p.menu[day], [meal]: v } } }));

    const save = async () => {
        setBusy(true); setError(null);
        try { await uacService.saveRestaurant({ ...r, id: r.id || undefined }); onSaved(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); }
        finally { setBusy(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="grid sm:grid-cols-3 gap-2">
                <input className={field} placeholder="Nom (ex. Resto U1)" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} maxLength={80} aria-label="Nom du restaurant" />
                <input className={field} placeholder="Lieu (ex. près de l’amphi 1000)" value={r.place} onChange={(e) => setR({ ...r, place: e.target.value })} maxLength={120} aria-label="Lieu" />
                <div className="flex items-center gap-3">
                    <input type="number" min={0} max={99} className={`${field} w-20`} value={r.order} onChange={(e) => setR({ ...r, order: Number(e.target.value) })} aria-label="Ordre d’affichage" />
                    <label className="flex items-center gap-1.5 text-sm text-gray-700"><input type="checkbox" checked={r.active} onChange={(e) => setR({ ...r, active: e.target.checked })} /> Affiché</label>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                    <thead><tr className="text-xs text-gray-500 text-left">
                        <th className="py-1 pr-2 w-24">Jour</th>
                        {MEALS.map((m) => <th key={m.slug} className="py-1 px-1">{m.icon} {m.label}</th>)}
                    </tr></thead>
                    <tbody>
                        {DAYS.map((d) => (
                            <tr key={d}>
                                <td className="py-1 pr-2 font-semibold text-ink">{dayLabel(d)}</td>
                                {MEALS.map((m) => (
                                    <td key={m.slug} className="p-1">
                                        <input className={field} value={r.menu[d][m.slug]} onChange={(e) => setDish(d, m.slug, e.target.value)} maxLength={120} aria-label={`${dayLabel(d)} ${m.label}`} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-500">Pas de prix. Le menu se répète chaque semaine : tu n’y touches que s’il change. Laisse vide un repas non servi.</p>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
                <Button onClick={save} isLoading={busy} disabled={r.name.trim().length < 2}>Enregistrer</Button>
                <Button variant="ghost" onClick={onCancel}>Annuler</Button>
            </div>
        </div>
    );
};

export const ConsoleUac = () => {
    const [restaurants, setRestaurants] = useState<UacRestaurant[]>([]);
    const [editing, setEditing] = useState<UacRestaurant | null>(null);
    const [news, setNews] = useState<UacNews[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [r, n] = await Promise.all([uacService.listRestaurants(true), uacService.listAllNews()]);
            setRestaurants(r); setNews(n);
        } catch (e) { setError(e instanceof Error ? e.message : 'Chargement impossible.'); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const act = async (fn: () => Promise<unknown>) => {
        try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Action impossible.'); }
    };

    return (
        <div className="space-y-8">
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <section className="space-y-3">
                <div className="flex items-center">
                    <h3 className="text-sm font-bold text-gray-800 mr-auto">Restaurants et menu de la semaine</h3>
                    {!editing && restaurants.length < 5 && <Button size="sm" onClick={() => setEditing(blank(restaurants.length + 1))}>+ Ajouter un restaurant</Button>}
                </div>
                {editing && <RestaurantEditor key={editing.id || 'new'} initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
                {restaurants.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3">
                        <div className="min-w-0 mr-auto">
                            <p className="text-sm font-semibold text-ink truncate">{r.name} {!r.active && <span className="text-xs text-gray-400">(masqué)</span>}</p>
                            {r.place && <p className="text-xs text-gray-500 truncate">{r.place}</p>}
                        </div>
                        <button className="text-sm font-semibold text-ochre" onClick={() => setEditing(r)}>Modifier le menu</button>
                        <button className="text-sm text-red-600" onClick={() => window.confirm(`Supprimer « ${r.name} » ?`) && act(() => uacService.deleteRestaurant(r.id))}>Supprimer</button>
                    </div>
                ))}
                {restaurants.length === 0 && !editing && <p className="text-sm text-gray-500 bg-white rounded-2xl p-4">Aucun restaurant pour l’instant. Ajoute le premier : le bandeau « Au menu aujourd’hui » apparaîtra dans l’onglet UAC.</p>}
            </section>

            <section className="space-y-3">
                <h3 className="text-sm font-bold text-gray-800">Actualités publiées (60 dernières)</h3>
                {news.length === 0 && <p className="text-sm text-gray-500 bg-white rounded-2xl p-4">Aucune actualité publiée.</p>}
                {news.map((n) => (
                    <div key={n.$id} className={`bg-white rounded-2xl border px-4 py-3 ${n.moderationStatus === 'masque' ? 'border-red-200 opacity-70' : 'border-gray-100'}`}>
                        <p className="text-xs text-gray-500">{NEWS_KINDS.find((k) => k.slug === n.kind)?.name || n.kind} · {n.authorName || 'anonyme'} · {new Date(n.createdAt).toLocaleDateString('fr-FR')}{n.moderationStatus === 'masque' && ' · MASQUÉE'}</p>
                        <p className="text-sm font-semibold text-ink break-words">{n.title}</p>
                        <p className="text-sm text-gray-600 line-clamp-2 break-words">{n.content}</p>
                        <div className="mt-2 flex gap-4 text-sm">
                            {n.moderationStatus === 'masque'
                                ? <button className="font-semibold text-ochre" onClick={() => act(() => uacService.showNews(n.$id))}>Réafficher</button>
                                : <button className="font-semibold text-ochre" onClick={() => act(() => uacService.hideNews(n.$id))}>Masquer</button>}
                            <button className="text-red-600" onClick={() => window.confirm('Supprimer définitivement ?') && act(() => uacService.deleteNews(n.$id))}>Supprimer</button>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
};

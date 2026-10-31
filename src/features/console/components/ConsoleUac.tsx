// src/features/console/components/ConsoleUac.tsx — Vanessa
// Espace UAC côté équipe : menu de la semaine de chaque restaurant (saisi UNE fois, il se répète chaque semaine),
// et modération des actualités publiées par les étudiants.
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LocationPicker } from '@/features/caSert/components/LocationPicker';
import { CAMPUS_CENTER, CAMPUS_ZOOM, DAYS, MEALS, NEWS_KINDS, PLACE_KINDS, type PlaceKind } from '@/features/uac/config';
import { dayLabel, emptyMenu } from '@/features/uac/lib/menu';
import { guessKind, parseLinkList, type LinkItem } from '@/features/uac/lib/links';
import { distanceMeters, normalize } from '@/features/uac/lib/geo';
import { uacService, type PlaceCandidate, type UacNews, type UacPlace, type UacRestaurant } from '@/features/uac/services/uacService';

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

const KIND_NAME = Object.fromEntries(PLACE_KINDS.map((k) => [k.slug, `${k.icon} ${k.name}`]));

const PlaceEditor = ({ initial, onSaved, onCancel }: { initial: UacPlace | null; onSaved: () => void; onCancel: () => void }) => {
    const [name, setName] = useState(initial?.name || '');
    const [kind, setKind] = useState<PlaceKind>(initial?.kind || 'amphi');
    const [description, setDescription] = useState(initial?.description || '');
    const [pos, setPos] = useState<{ lat: number; lng: number } | null>(initial ? { lat: initial.latitude, lng: initial.longitude } : null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async () => {
        if (!pos) return;
        setBusy(true); setError(null);
        try { await uacService.savePlace({ id: initial?.$id, name, kind, description, latitude: pos.lat, longitude: pos.lng }); onSaved(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); }
        finally { setBusy(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
                <input className={field} placeholder="Nom (ex. Amphi 1000)" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} aria-label="Nom du lieu" />
                <select className={field} value={kind} onChange={(e) => setKind(e.target.value as PlaceKind)} aria-label="Type de lieu">
                    {PLACE_KINDS.map((k) => <option key={k.slug} value={k.slug}>{k.icon} {k.name}</option>)}
                </select>
            </div>
            <input className={field} placeholder="Précision utile (facultatif) : horaires, étage, repère…" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} aria-label="Description" />
            <LocationPicker center={CAMPUS_CENTER} zoom={CAMPUS_ZOOM + 1.5} initial={pos || undefined} onChange={(lat, lng) => setPos({ lat, lng })} />
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
                <Button onClick={save} isLoading={busy} disabled={name.trim().length < 2 || !pos}>Enregistrer</Button>
                <Button variant="ghost" onClick={onCancel}>Annuler</Button>
            </div>
        </div>
    );
};

interface LinkRow extends LinkItem { kind: PlaceKind; error?: string; warning?: string; picked: boolean }

// Colle « nom + lien Google Maps » : le serveur retrouve les coordonnées, tu vérifies, puis tu enregistres.
const LinkImport = ({ existing, onDone }: { existing: UacPlace[]; onDone: () => void }) => {
    const [text, setText] = useState('');
    const [rows, setRows] = useState<LinkRow[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const analyse = async () => {
        const items = parseLinkList(text);
        if (items.length === 0) { setError('Je ne trouve aucun lieu. Format : le nom sur une ligne, puis son lien Google Maps sur la ligne suivante.'); return; }
        setBusy(true); setError(null); setNote(null);
        try {
            const toResolve = items.filter((i) => i.url && i.latitude === undefined).map((i) => ({ key: i.key, url: i.url! }));
            const results = toResolve.length ? await uacService.resolveMapLinks(toResolve) : [];
            const byKey = new Map(results.map((r) => [r.key, r]));
            setRows(items.map((it) => {
                const r = byKey.get(it.key);
                const latitude = it.latitude ?? r?.latitude;
                const longitude = it.longitude ?? r?.longitude;
                const base: LinkRow = { ...it, latitude, longitude, kind: guessKind(it.name), picked: latitude !== undefined, error: r?.error };
                if (latitude !== undefined && longitude !== undefined) {
                    const near = existing.find((p) => normalize(p.name) === normalize(it.name) || distanceMeters({ lat: latitude, lng: longitude }, { lat: p.latitude, lng: p.longitude }) < 25);
                    if (near) { base.warning = `Ressemble à « ${near.name} » déjà enregistré`; base.picked = false; }
                }
                return base;
            }));
        } catch (e) { setError(e instanceof Error ? e.message : 'Analyse impossible.'); }
        finally { setBusy(false); }
    };

    const patch = (key: string, p: Partial<LinkRow>) => setRows((rs) => (rs || []).map((r) => (r.key === key ? { ...r, ...p } : r)));
    const chosen = (rows || []).filter((r) => r.picked && r.latitude !== undefined && r.longitude !== undefined && r.name.trim().length >= 2);

    const save = async () => {
        setBusy(true); setError(null);
        try {
            const r = await uacService.savePlaces(chosen.map((c) => ({ name: c.name, kind: c.kind, latitude: c.latitude!, longitude: c.longitude! })));
            setNote(`${r.saved} lieu(x) enregistré(s).`);
            setRows(null); setText('');
            onDone();
        } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); }
        finally { setBusy(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <p className="text-sm text-gray-600">Colle ta liste : le <strong>nom</strong> sur une ligne, puis son <strong>lien Google Maps</strong> (ou ses coordonnées « 6.41, 2.34 ») sur la ligne suivante. Tu peux en coller 40 d’un coup.</p>
            <textarea className={`${field} min-h-[160px] font-mono`} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Amphi A-500\nhttps://goo.gl/maps/xxxx\n\nRectorat\nhttps://goo.gl/maps/yyyy'} aria-label="Liste de lieux avec liens" />
            <Button size="sm" onClick={analyse} isLoading={busy && !rows} disabled={!text.trim()}>Analyser les liens</Button>
            {note && <p className="text-sm text-green-700">{note}</p>}
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {rows && (
                <>
                    <p className="text-sm text-gray-600">{rows.filter((r) => r.latitude !== undefined).length} sur {rows.length} lien(s) lu(s). Corrige les noms et les types si besoin, décoche ce que tu ne veux pas.</p>
                    <ul className="divide-y divide-gray-100">
                        {rows.map((r) => (
                            <li key={r.key} className="py-2 space-y-1">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={r.picked} disabled={r.latitude === undefined} onChange={(e) => patch(r.key, { picked: e.target.checked })} aria-label={`Garder ${r.name}`} />
                                    <input className={field} value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} maxLength={100} aria-label="Nom" />
                                    <select className={`${field} w-44`} value={r.kind} onChange={(e) => patch(r.key, { kind: e.target.value as PlaceKind })} aria-label="Type">
                                        {PLACE_KINDS.map((k) => <option key={k.slug} value={k.slug}>{k.icon} {k.name}</option>)}
                                    </select>
                                </div>
                                {r.latitude !== undefined && <p className="pl-6 text-xs text-gray-400">📍 {r.latitude.toFixed(5)}, {r.longitude!.toFixed(5)}</p>}
                                {r.warning && <p className="pl-6 text-xs text-amber-700">⚠️ {r.warning}</p>}
                                {r.latitude === undefined && <p className="pl-6 text-xs text-red-600">✗ {r.error || 'Lien illisible.'} Ouvre le lieu dans Google Maps, copie ses coordonnées (clic droit sur l’épingle) et mets-les sous le nom à la place du lien.</p>}
                            </li>
                        ))}
                    </ul>
                    <Button onClick={save} isLoading={busy} disabled={chosen.length === 0}>Enregistrer {chosen.length} lieu(x)</Button>
                </>
            )}
        </div>
    );
};

const OsmImport = ({ onDone }: { onDone: () => void }) => {
    const [radius, setRadius] = useState(2500);
    const [busy, setBusy] = useState(false);
    const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null);
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [note, setNote] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const search = async () => {
        setBusy(true); setError(null); setNote(null);
        try {
            const r = await uacService.importOsmPlaces(CAMPUS_CENTER[1], CAMPUS_CENTER[0], radius);
            setCandidates(r.candidates);
            setPicked(new Set());
            setNote(`${r.found} lieu(x) nommé(s) trouvé(s) sur OpenStreetMap, ${r.candidates.length} nouveau(x) (les déjà enregistrés sont écartés).`);
        } catch (e) { setError(e instanceof Error ? e.message : 'Recherche impossible.'); }
        finally { setBusy(false); }
    };

    const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const save = async () => {
        setBusy(true); setError(null);
        try {
            const r = await uacService.savePlaces((candidates || []).filter((c) => picked.has(c.osmId)));
            setNote(`${r.saved} lieu(x) enregistré(s).`);
            setCandidates(null);
            onDone();
        } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); }
        finally { setBusy(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <p className="text-sm text-gray-600">Propose des lieux déjà connus d’OpenStreetMap autour du centre du campus. Rien n’est enregistré sans que tu coches. OpenStreetMap est souvent incomplet : complète ensuite à la main.</p>
            <div className="flex items-center gap-2">
                <select className={`${field} w-40`} value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="Rayon de recherche">
                    {[1000, 2000, 2500, 3000, 4000].map((r) => <option key={r} value={r}>Rayon {r / 1000} km</option>)}
                </select>
                <Button size="sm" onClick={search} isLoading={busy && !candidates}>Chercher sur OpenStreetMap</Button>
            </div>
            {note && <p className="text-sm text-green-700">{note}</p>}
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {candidates && candidates.length > 0 && (
                <>
                    <div className="flex gap-3 text-sm">
                        <button className="font-semibold text-ochre" onClick={() => setPicked(new Set(candidates.map((c) => c.osmId)))}>Tout cocher</button>
                        <button className="text-gray-500" onClick={() => setPicked(new Set())}>Tout décocher</button>
                    </div>
                    <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                        {candidates.map((c) => (
                            <li key={c.osmId}>
                                <label className="flex items-center gap-3 py-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={picked.has(c.osmId)} onChange={() => toggle(c.osmId)} />
                                    <span className="min-w-0"><span className="block font-semibold text-ink truncate">{c.name}</span><span className="block text-xs text-gray-500">{KIND_NAME[c.kind]}</span></span>
                                </label>
                            </li>
                        ))}
                    </ul>
                    <Button onClick={save} isLoading={busy} disabled={picked.size === 0}>Enregistrer les {picked.size} coché(s)</Button>
                </>
            )}
        </div>
    );
};

export const ConsoleUac = () => {
    const [restaurants, setRestaurants] = useState<UacRestaurant[]>([]);
    const [editing, setEditing] = useState<UacRestaurant | null>(null);
    const [news, setNews] = useState<UacNews[]>([]);
    const [places, setPlaces] = useState<UacPlace[]>([]);
    const [placeEditing, setPlaceEditing] = useState<UacPlace | 'new' | null>(null);
    const [importing, setImporting] = useState(false);
    const [linking, setLinking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [r, n, p] = await Promise.all([uacService.listRestaurants(true), uacService.listAllNews(), uacService.listPlaces(true)]);
            setRestaurants(r); setNews(n); setPlaces(p);
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
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-800 mr-auto">Lieux du campus ({places.length})</h3>
                    <Button size="sm" variant="ghost" onClick={() => { setLinking((v) => !v); setImporting(false); setPlaceEditing(null); }}>Ajouter par liens Google Maps</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setImporting((v) => !v); setLinking(false); setPlaceEditing(null); }}>Importer depuis OpenStreetMap</Button>
                    <Button size="sm" onClick={() => { setPlaceEditing('new'); setImporting(false); setLinking(false); }}>+ Ajouter un lieu</Button>
                </div>
                {linking && <LinkImport existing={places} onDone={load} />}
                {importing && <OsmImport onDone={load} />}
                {placeEditing && <PlaceEditor key={placeEditing === 'new' ? 'new' : placeEditing.$id} initial={placeEditing === 'new' ? null : placeEditing} onCancel={() => setPlaceEditing(null)} onSaved={() => { setPlaceEditing(null); load(); }} />}
                <ul className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
                    {places.map((p) => (
                        <li key={p.$id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="min-w-0 mr-auto"><span className="block text-sm font-semibold text-ink truncate">{p.name}</span><span className="block text-xs text-gray-500">{KIND_NAME[p.kind]}</span></span>
                            <button className="text-sm font-semibold text-ochre" onClick={() => { setPlaceEditing(p); setImporting(false); }}>Modifier</button>
                            <button className="text-sm text-red-600" onClick={() => window.confirm(`Supprimer « ${p.name} » ?`) && act(() => uacService.deletePlace(p.$id))}>Supprimer</button>
                        </li>
                    ))}
                    {places.length === 0 && <li className="px-4 py-4 text-sm text-gray-500">Aucun lieu. Commence par l’import OpenStreetMap, puis complète à la main.</li>}
                </ul>
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

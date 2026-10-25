// src/features/console/components/ConsoleZemCards.tsx — Zem
// Fiches manuelles : tes propres informations, que Zem trouve comme n'importe quelle page.
import { useCallback, useEffect, useState } from 'react';
import { moteurService, type ZemCard, type ZemCategory } from '@/features/moteur/services/moteurService';
import { CATEGORY_META, CATEGORY_ORDER, TRUST_META, freshnessLabel } from '@/features/moteur/lib/phrases';

const input = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm min-h-[44px]';
const EMPTY = { id: '' as string, title: '', text: '', link: '', category: 'actualites' as ZemCategory, city: '', trust: 3 as 1 | 2 | 3 };

export const ConsoleZemCards = () => {
    const [cards, setCards] = useState<ZemCard[] | null>(null);
    const [form, setForm] = useState(EMPTY);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(async () => {
        try { setCards(await moteurService.listCards()); }
        catch (e: any) { setCards([]); setMessage({ ok: false, text: e.message || 'Impossible de charger les fiches.' }); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setMessage(null);
        try {
            await moteurService.saveCard({ ...form, id: form.id || undefined });
            setMessage({ ok: true, text: form.id ? 'Fiche modifiée.' : 'Fiche ajoutée : Zem peut déjà la trouver.' });
            setForm(EMPTY);
            await load();
        } catch (err: any) {
            setMessage({ ok: false, text: err.message || 'Enregistrement impossible.' });
        } finally { setBusy(false); }
    };

    const remove = async (c: ZemCard) => {
        if (!window.confirm(`Supprimer la fiche « ${c.title} » ?`)) return;
        setBusy(true);
        try { await moteurService.deleteCard(c.id); if (form.id === c.id) setForm(EMPTY); await load(); }
        catch (err: any) { setMessage({ ok: false, text: err.message || 'Suppression impossible.' }); }
        finally { setBusy(false); }
    };

    return (
        <div className="space-y-5">
            <p className="text-sm text-gray-600">
                Une fiche, c’est une information que tu écris toi-même (une date, un prix, une adresse, une consigne…). Zem la trouve et l’affiche comme une page, avec le badge de confiance que tu choisis.
            </p>
            {message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${message.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{message.text}</p>}

            <form onSubmit={save} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <h3 className="font-bold text-ink">{form.id ? 'Modifier la fiche' : 'Nouvelle fiche'}</h3>
                <label className="block text-sm"><span className="text-gray-600">Titre</span>
                    <input className={input} required minLength={3} maxLength={200} placeholder="Inscriptions à l’UAC : date limite" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                <label className="block text-sm"><span className="text-gray-600">Texte <span className="text-gray-400">(les mots que les gens vont chercher doivent y figurer)</span></span>
                    <textarea className={`${input} min-h-[140px]`} required minLength={20} maxLength={8000} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></label>
                <label className="block text-sm"><span className="text-gray-600">Lien <span className="text-gray-400">(facultatif — pour renvoyer vers la source)</span></span>
                    <input className={input} type="url" placeholder="https://…" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></label>
                <div className="grid sm:grid-cols-3 gap-3">
                    <label className="block text-sm"><span className="text-gray-600">Rubrique</span>
                        <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ZemCategory })}>
                            {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>)}
                        </select></label>
                    <label className="block text-sm"><span className="text-gray-600">Ville</span>
                        <input className={input} placeholder="Cotonou" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
                    <label className="block text-sm"><span className="text-gray-600">Confiance</span>
                        <select className={input} value={form.trust} onChange={(e) => setForm({ ...form, trust: Number(e.target.value) as 1 | 2 | 3 })}>
                            <option value={3}>3 — Officiel / vérifié</option><option value={2}>2 — Fiable</option><option value={1}>1 — À vérifier</option>
                        </select></label>
                </div>
                <div className="flex gap-2">
                    <button disabled={busy} className="rounded-full bg-brand text-ink font-bold px-5 min-h-[44px] disabled:opacity-50">{form.id ? 'Enregistrer' : 'Ajouter la fiche'}</button>
                    {form.id && <button type="button" onClick={() => setForm(EMPTY)} className="rounded-full bg-sand text-ink font-semibold px-5 min-h-[44px]">Annuler</button>}
                </div>
            </form>

            <section>
                <h3 className="font-bold text-ink mb-2">Mes fiches {cards ? `(${cards.length})` : ''}</h3>
                {cards === null && <p className="text-sm text-gray-400">Chargement…</p>}
                {cards?.length === 0 && <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-4">Aucune fiche pour le moment.</p>}
                <div className="space-y-2">
                    {cards?.map((c) => (
                        <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-3">
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-ink break-words">{c.title}</p>
                                <span className={`shrink-0 text-xs font-bold rounded-full px-2 py-0.5 ${TRUST_META[c.trust].className}`}>{TRUST_META[c.trust].label}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2 break-words">{c.text}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {CATEGORY_META[c.category]?.emoji} {CATEGORY_META[c.category]?.label}{c.city ? ` · 📍 ${c.city}` : ''} · {freshnessLabel(c.publishedAt)} · ouverte {c.clicks} fois
                            </p>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => { setForm({ id: c.id, title: c.title, text: c.text, link: c.link, category: c.category, city: c.city, trust: c.trust }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="rounded-lg bg-sand text-ink text-xs font-semibold px-3 min-h-[36px]">Modifier</button>
                                <button disabled={busy} onClick={() => remove(c)} className="rounded-lg text-red-700 text-xs font-semibold px-3 min-h-[36px] hover:bg-red-50">Supprimer</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

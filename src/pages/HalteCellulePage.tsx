// src/pages/HalteCellulePage.tsx — HALTE
// Espace de la cellule d'écoute : les alertes reçues, à traiter une par une. Données très sensibles :
// chaque consultation est enregistrée (qui a lu quoi) côté serveur.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, MessageSquare, Mic } from 'lucide-react';
import { halteCellule, type AlertDetail, type AlertRow, type AlertStatus } from '@/features/halte/services/halteService';
import { timeAgo } from '@/features/console/services/platformService';

const PRIORITY = {
    urgent: { label: 'URGENT', className: 'bg-red-600 text-white' },
    normale: { label: 'Normale', className: 'bg-brand text-ink' },
    basse: { label: 'Basse', className: 'bg-gray-200 text-gray-700' },
} as const;
const STATUS_LABEL: Record<AlertStatus, string> = { nouvelle: 'Nouvelle', en_cours: 'En cours', traitee: 'Traitée', sans_suite: 'Sans suite', test: 'Test' };
const FLAG_LABEL: Record<string, string> = { rafale: 'Plusieurs envois du même téléphone', doublon: 'Même numéro qu’une alerte déjà ouverte', rapide: 'Formulaire rempli très vite', sans_contact: 'Aucun moyen de rappeler', vocal: 'Message vocal : écoute-le, le numéro et le lieu y sont peut-être dits', audio_perdu: 'Un message vocal a été envoyé mais n’a pas pu être enregistré : rappelle vite' };
const TABS: Array<{ id: 'open' | AlertStatus; label: string }> = [{ id: 'open', label: 'À traiter' }, { id: 'traitee', label: 'Traitées' }, { id: 'sans_suite', label: 'Sans suite' }];

export default function HalteCellulePage() {
    const [tab, setTab] = useState<'open' | AlertStatus>('open');
    const [rows, setRows] = useState<AlertRow[] | null>(null);
    const [detail, setDetail] = useState<AlertDetail | null>(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<{ index: number; url: string } | null>(null);
    useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl.url); }, [audioUrl]);

    const listen = async (index: number) => {
        if (!detail || busy) return;
        setBusy(true);
        try {
            const a = await halteCellule.audio(detail.id, index);
            const bytes = Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0));
            setAudioUrl({ index, url: URL.createObjectURL(new Blob([bytes], { type: a.mime })) });
        } catch (e: any) { setError(e.message || 'Écoute impossible.'); } finally { setBusy(false); }
    };

    const load = useCallback(async () => {
        try {
            const r = await halteCellule.list(tab === 'open' ? undefined : tab);
            setRows(r.alerts);
            setError(null);
        } catch (e: any) {
            setError(e.message || 'Chargement impossible.');
        }
    }, [tab]);

    useEffect(() => {
        setRows(null);
        load();
        const t = setInterval(() => { if (!detail) load(); }, 45000);
        return () => clearInterval(t);
    }, [load, detail]);

    const open = async (id: string) => {
        setError(null);
        try { setDetail(await halteCellule.get(id)); } catch (e: any) { setError(e.message || 'Alerte introuvable.'); }
    };
    const act = async (data: { status?: AlertStatus; note?: string; assignToMe?: boolean }) => {
        if (!detail || busy) return;
        setBusy(true);
        try {
            setDetail(await halteCellule.update(detail.id, data));
            setNote('');
        } catch (e: any) { setError(e.message || 'Action impossible.'); } finally { setBusy(false); }
    };
    const back = () => { setDetail(null); setAudioUrl(null); load(); };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link to="/accueil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Cellule d’écoute HALTE</h1>
                        <p className="text-xs text-gray-500">Données très sensibles : ne les copie nulle part. Chaque consultation est enregistrée.</p>
                    </div>
                </div>
                {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}

                {!detail && (
                    <>
                        <div className="flex gap-1">
                            {TABS.map((t) => (
                                <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${tab === t.id ? 'bg-brand text-ink' : 'text-gray-600 hover:bg-gray-100'}`}>{t.label}</button>
                            ))}
                            <button onClick={load} className="ml-auto text-xs font-semibold text-ochre">Actualiser</button>
                        </div>
                        {!rows && !error && <p className="text-sm text-gray-400">Chargement...</p>}
                        {rows?.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400">Rien ici pour l’instant.</div>}
                        <div className="space-y-2">
                            {rows?.map((r) => (
                                <button key={r.id} onClick={() => open(r.id)} className={`w-full text-left bg-white rounded-2xl border p-3.5 ${r.priority === 'urgent' ? 'border-red-300' : 'border-gray-100'} hover:border-brand`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-ink">{r.ref}</span>
                                        <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${PRIORITY[r.priority].className}`}>{PRIORITY[r.priority].label}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-1 break-words">{r.place || 'Lieu non précisé'}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {timeAgo(r.createdAt)} · {STATUS_LABEL[r.status]} · {r.channel.toUpperCase()}{r.hasPhone ? ' · numéro donné' : ' · sans numéro'}{r.hasAudio ? ' · 🎤 vocal' : ''}{r.posterCode ? ` · affiche ${r.posterCode}` : ''}
                                    </p>
                                    {r.flags.length > 0 && <p className="text-xs text-amber-700 mt-1">{r.flags.map((f) => FLAG_LABEL[f] || f).join(' · ')}</p>}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {detail && (
                    <div className="space-y-3">
                        <button onClick={back} className="text-xs font-semibold text-ochre">← Retour à la liste</button>
                        <div className={`bg-white rounded-2xl border p-4 space-y-3 ${detail.priority === 'urgent' ? 'border-red-300' : 'border-gray-100'}`}>
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-lg font-bold text-ink">{detail.ref}</h2>
                                <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${PRIORITY[detail.priority].className}`}>{PRIORITY[detail.priority].label}</span>
                            </div>
                            <p className="text-xs text-gray-500">Reçue {timeAgo(detail.createdAt)} · {STATUS_LABEL[detail.status]} · canal {detail.channel.toUpperCase()}{detail.posterCode ? ` · affiche ${detail.posterCode}` : ''}</p>
                            <dl className="text-sm space-y-1.5">
                                <div><dt className="inline text-gray-500">Concerné : </dt><dd className="inline font-semibold">{detail.forWho === 'self' ? 'La personne elle-même' : detail.forWho === 'other' ? 'Quelqu’un d’autre' : 'Non précisé'}</dd></div>
                                <div><dt className="inline text-gray-500">Danger immédiat : </dt><dd className={`inline font-semibold ${detail.danger ? 'text-red-600' : ''}`}>{detail.danger ? 'OUI' : 'non'}</dd></div>
                                <div><dt className="inline text-gray-500">Lieu : </dt><dd className="inline font-semibold break-words">{detail.place || '—'}</dd></div>
                                <div><dt className="inline text-gray-500">Rappel : </dt><dd className="inline font-semibold">{detail.callOk ? `OK${detail.bestTime ? ` (${detail.bestTime})` : ''}` : 'La personne n’a pas demandé à être rappelée'}</dd></div>
                            </dl>
                            {detail.audioCount > 0 && (
                                <div className="rounded-xl bg-sand p-3 space-y-2">
                                    <p className="text-sm font-bold flex items-center gap-2"><Mic size={16} aria-hidden />Message vocal{detail.audioCount > 1 ? ` (${detail.audioCount})` : ''} — l’écoute est enregistrée</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from({ length: detail.audioCount }, (_, i) => (
                                            <button key={i} disabled={busy} onClick={() => listen(i)} className="rounded-full bg-ink text-white font-bold px-4 min-h-[44px]">{audioUrl?.index === i ? 'Recharger' : 'Écouter'}{detail.audioCount > 1 ? ` n° ${i + 1}` : ''}</button>
                                        ))}
                                    </div>
                                    {audioUrl && <audio src={audioUrl.url} controls autoPlay className="w-full" />}
                                </div>
                            )}
                            {detail.message && <p className="text-sm whitespace-pre-line break-words rounded-xl bg-sand p-3">{detail.message}</p>}
                            <div className="flex flex-wrap gap-2">
                                {detail.phone && <a href={`tel:${detail.phone}`} className="inline-flex items-center gap-2 rounded-full bg-ink text-white font-bold px-4 min-h-[44px]"><Phone size={16} aria-hidden />Appeler {detail.phone}</a>}
                                {detail.phone && <a href={`sms:${detail.phone}`} className="inline-flex items-center gap-2 rounded-full border border-gray-300 font-bold px-4 min-h-[44px]"><MessageSquare size={16} aria-hidden />SMS</a>}
                                {detail.geo && <a href={`https://www.google.com/maps?q=${detail.geo.split(',').slice(0, 2).join(',')}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full border border-gray-300 font-bold px-4 min-h-[44px]"><MapPin size={16} aria-hidden />Voir la position (±{detail.geo.split(',')[2] || '?'} m)</a>}
                            </div>
                            {detail.flags.length > 0 && <p className="text-xs text-amber-700">Signaux : {detail.flags.map((f) => FLAG_LABEL[f] || f).join(' · ')}. Un signal n’est jamais une preuve de fausse alerte : vérifie en rappelant.</p>}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {detail.status === 'nouvelle' && <button disabled={busy} onClick={() => act({ assignToMe: true })} className="rounded-xl bg-brand text-ink font-bold px-4 min-h-[44px]">Je prends en charge</button>}
                                {detail.status !== 'traitee' && <button disabled={busy} onClick={() => act({ status: 'traitee' })} className="rounded-xl border border-gray-300 font-semibold px-4 min-h-[44px]">Marquer traitée</button>}
                                {detail.status !== 'sans_suite' && <button disabled={busy} onClick={() => { if (window.confirm('Classer sans suite (par exemple : fausse alerte, test, personne injoignable après plusieurs essais) ? Ajoute une note pour dire pourquoi.')) act({ status: 'sans_suite' }); }} className="rounded-xl border border-gray-300 font-semibold px-4 min-h-[44px]">Sans suite</button>}
                                {(detail.status === 'traitee' || detail.status === 'sans_suite') && <button disabled={busy} onClick={() => act({ status: 'en_cours' })} className="rounded-xl border border-gray-300 font-semibold px-4 min-h-[44px]">Rouvrir</button>}
                            </div>
                            <div className="flex gap-2">
                                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} placeholder="Ajouter une note (appel passé, mesures prises…)" className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 min-h-[44px] text-sm outline-none focus:border-brand" />
                                <button disabled={busy || !note.trim()} onClick={() => act({ note })} className="rounded-xl bg-ink text-white font-semibold px-4 min-h-[44px] disabled:opacity-50">Ajouter</button>
                            </div>
                            <ul className="text-xs text-gray-600 space-y-1.5">
                                {[...detail.timeline].reverse().map((t, i) => (
                                    <li key={i}><span className="text-gray-400">{new Date(t.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span> · <strong>{t.by}</strong> · {t.action === 'consultation' ? 'a consulté la fiche' : t.action === 'statut' ? `statut → ${STATUS_LABEL[t.text as AlertStatus] || t.text}` : t.action === 'écoute' ? `a écouté le ${t.text}` : t.action === 'prise en charge' ? 'a pris en charge' : t.text}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// src/pages/HaltePage.tsx — HALTE
// Page publique ouverte par le QR code : AUCUN compte, AUCUNE question inutile. Elle sert à demander de l'aide
// en moins d'une minute, même avec un téléphone simple et un réseau faible.
//   - les numéros d'urgence sont tout en haut (appel direct) ;
//   - « Quitter vite » est toujours visible ;
//   - sans réseau, le message est gardé et part tout seul au retour de la connexion ;
//   - rien n'est enregistré sur l'appareil à part ce message en attente.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, WifiOff } from 'lucide-react';
import { QuickExit, EmergencyNumbers, Choice } from '@/features/halte/components/HalteParts';
import { sendAlert, type AlertPayload } from '@/features/halte/services/halteService';
import { flushQueue, pendingAlerts, queueAlert } from '@/features/halte/lib/offlineQueue';
import { SMS_NUMBER, NUMBERS_VERIFIED_ON } from '@/features/halte/config';

type Screen = 'home' | 'form' | 'info' | 'done';
const TIMES = [['', 'À n’importe quel moment'], ['matin', 'Le matin'], ['apres-midi', 'L’après-midi'], ['soir', 'Le soir']] as const;

function useRegisterOffline() {
    useEffect(() => {
        document.title = 'Parler en sécurité';
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex, nofollow';
        document.head.appendChild(meta);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/halte-sw.js', { scope: '/halte' }).catch(() => { /* hors-ligne indisponible : tout le reste marche */ });
        }
        return () => { meta.remove(); };
    }, []);
}

export default function HaltePage() {
    useRegisterOffline();
    const [params] = useSearchParams();
    const posterCode = (params.get('p') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
    const [screen, setScreen] = useState<Screen>('home');
    const openedAt = useRef(Date.now());

    const [forWho, setForWho] = useState<'self' | 'other'>('self');
    const [danger, setDanger] = useState<boolean | null>(null);
    const [place, setPlace] = useState('');
    const [geo, setGeo] = useState('');
    const [geoState, setGeoState] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle');
    const [phone, setPhone] = useState('');
    const [callOk, setCallOk] = useState(true);
    const [bestTime, setBestTime] = useState('');
    const [message, setMessage] = useState('');
    const [website, setWebsite] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ ref?: string; queued: boolean } | null>(null);
    const [waiting, setWaiting] = useState(() => pendingAlerts().length);

    // Au retour du réseau (ou à l'ouverture), on envoie ce qui attendait.
    const flush = useCallback(async () => {
        if (!pendingAlerts().length) return;
        const refs = await flushQueue(sendAlert);
        setWaiting(pendingAlerts().length);
        if (refs.length) setResult((r) => (r?.queued ? { ref: refs[refs.length - 1], queued: false } : r));
    }, []);
    useEffect(() => {
        flush();
        window.addEventListener('online', flush);
        return () => window.removeEventListener('online', flush);
    }, [flush]);

    const locate = () => {
        if (!navigator.geolocation) { setGeoState('denied'); return; }
        setGeoState('loading');
        navigator.geolocation.getCurrentPosition(
            (p) => { setGeo(`${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)},${Math.round(p.coords.accuracy)}`); setGeoState('ok'); },
            () => setGeoState('denied'),
            { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
        );
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (sending) return;
        setError(null);
        if (!place.trim() && !geo && !phone.trim() && !message.trim()) {
            setError('Dis-nous au moins où tu es, ou comment te joindre, ou écris quelques mots.');
            return;
        }
        const payload: AlertPayload = {
            forWho, danger: danger === true, place: place.trim(), geo, phone: phone.trim(), callOk: callOk && !!phone.trim(),
            bestTime, message: message.trim(), posterCode, fillMs: Date.now() - openedAt.current, website,
        };
        setSending(true);
        try {
            const ref = await sendAlert(payload as unknown as Record<string, unknown>);
            setResult({ ref, queued: false });
            setScreen('done');
        } catch (err: any) {
            if (err?.permanent) {
                setError(err.message);
            } else {
                // Pas de réseau ou service injoignable : on garde le message sur le téléphone.
                queueAlert(payload as unknown as Record<string, unknown>);
                setWaiting(pendingAlerts().length);
                setResult({ queued: true });
                setScreen('done');
            }
        } finally {
            setSending(false);
        }
    };

    const smsHref = SMS_NUMBER ? `sms:${SMS_NUMBER}?body=${encodeURIComponent(`HALTE ${posterCode || ''}`.trim())}` : '';
    const label = 'block text-sm font-bold text-ink mb-1.5';
    const input = 'w-full rounded-2xl border-2 border-gray-200 bg-white px-4 min-h-[52px] text-base outline-none focus:border-ink';

    return (
        <div className="min-h-screen bg-cream text-ink">
            <QuickExit />
            <main className="max-w-lg mx-auto px-4 pt-16 pb-16 space-y-4">
                {screen === 'home' && (
                    <>
                        <header className="space-y-2">
                            <h1 className="text-3xl font-extrabold leading-tight">Tu peux parler.<br />Tu n’as rien fait de mal.</h1>
                            <p className="text-base text-gray-700">
                                Si quelqu’un te touche, te force ou te fait peur, ou si tu sais que ça arrive à quelqu’un, tu as le droit de le dire.
                                Ce que tu écris ici est lu par de vraies personnes formées, pas par une machine.
                            </p>
                        </header>
                        <EmergencyNumbers />
                        <button onClick={() => setScreen('form')} className="w-full rounded-full bg-brand text-ink font-extrabold text-lg min-h-[60px] shadow">
                            Envoyer un message en sécurité
                        </button>
                        <button onClick={() => setScreen('info')} className="w-full rounded-full bg-white border-2 border-gray-200 font-bold min-h-[52px]">
                            Je veux d’abord comprendre ce qui va se passer
                        </button>
                        {waiting > 0 && (
                            <p className="flex items-start gap-2 text-sm bg-sand rounded-2xl p-3"><WifiOff size={18} className="shrink-0 mt-0.5" aria-hidden />Un message est gardé sur ce téléphone. Il partira dès que le réseau reviendra.</p>
                        )}
                        {NUMBERS_VERIFIED_ON === '' && import.meta.env.DEV && <p className="text-xs text-red-700">⚠️ Numéros non vérifiés (voir config.ts).</p>}
                    </>
                )}

                {screen === 'info' && (
                    <>
                        <h1 className="text-2xl font-extrabold">Ce qui va se passer</h1>
                        <ol className="space-y-3 text-base">
                            {[
                                'Tu écris quelques lignes, ou juste où tu es et ton numéro. Tu n’es pas obligé(e) de raconter ce qui s’est passé.',
                                'Ton message arrive à une équipe d’écoute formée. Elle te rappelle, doucement, seulement si tu es d’accord.',
                                'On t’aide à être en sécurité et on t’oriente vers les services qui protègent : médecin, aide sociale, police si tu le souhaites. Rien ne se fait sans t’expliquer.',
                                'Tu peux envoyer ton message sans donner ton nom. Il n’est lu que par l’équipe d’écoute.',
                            ].map((t, i) => (
                                <li key={i} className="flex gap-3"><span className="shrink-0 w-8 h-8 rounded-full bg-brand font-extrabold flex items-center justify-center">{i + 1}</span><span>{t}</span></li>
                            ))}
                        </ol>
                        <p className="text-base bg-white rounded-2xl p-4 border border-gray-100">
                            <strong>Tes droits.</strong> Personne n’a le droit de toucher ton corps contre ta volonté, même quelqu’un que tu connais ou qui te donne de l’argent ou des cadeaux. Si tu es mineur(e), la loi te protège encore plus. Ce n’est jamais ta faute.
                        </p>
                        <EmergencyNumbers title="Pour parler tout de suite, appelle" />
                        <button onClick={() => setScreen('form')} className="w-full rounded-full bg-brand font-extrabold text-lg min-h-[60px]">Envoyer un message en sécurité</button>
                        <button onClick={() => setScreen('home')} className="w-full text-sm font-bold underline min-h-[44px]">Retour</button>
                    </>
                )}

                {screen === 'form' && (
                    <form onSubmit={submit} className="space-y-5" noValidate>
                        <h1 className="text-2xl font-extrabold">Ton message</h1>
                        <p className="text-sm text-gray-600">Réponds seulement à ce que tu peux. Rien n’est obligatoire, mais il nous faut au moins un moyen de t’aider.</p>

                        <fieldset>
                            <legend className={label}>Qui est concerné ?</legend>
                            <div className="flex gap-2"><Choice selected={forWho === 'self'} onClick={() => setForWho('self')}>Moi</Choice><Choice selected={forWho === 'other'} onClick={() => setForWho('other')}>Quelqu’un d’autre</Choice></div>
                        </fieldset>

                        <fieldset>
                            <legend className={label}>Est-ce que c’est un danger tout de suite ?</legend>
                            <div className="flex gap-2"><Choice selected={danger === true} onClick={() => setDanger(true)}>Oui, maintenant</Choice><Choice selected={danger === false} onClick={() => setDanger(false)}>Non</Choice></div>
                            {danger === true && <div className="mt-3"><EmergencyNumbers title="Appelle aussi, c’est le plus rapide" /></div>}
                        </fieldset>

                        <div>
                            <label htmlFor="halte-place" className={label}>Où es-tu, ou où ça se passe ?</label>
                            <input id="halte-place" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={300} placeholder="Quartier, village, repère (marché, école…)" className={input} autoComplete="off" />
                            <button type="button" onClick={locate} disabled={geoState === 'loading'} className="mt-2 inline-flex items-center gap-2 rounded-full border-2 border-gray-200 bg-white font-bold px-4 min-h-[48px]">
                                <MapPin size={18} aria-hidden />
                                {geoState === 'ok' ? 'Position partagée ✓' : geoState === 'loading' ? 'Recherche…' : 'Partager ma position'}
                            </button>
                            {geoState === 'denied' && <p className="text-sm text-gray-600 mt-1">Pas de position ? Ce n’est pas grave, écris l’endroit ci-dessus.</p>}
                        </div>

                        <div>
                            <label htmlFor="halte-phone" className={label}>Ton numéro, pour qu’on te rappelle (facultatif)</label>
                            <input id="halte-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" maxLength={30} placeholder="Ex. 01 97 00 00 00" className={input} autoComplete="off" />
                            {phone.trim() && (
                                <div className="mt-2 space-y-2">
                                    <label className="flex items-center gap-3 min-h-[44px] text-base"><input type="checkbox" className="w-6 h-6" checked={callOk} onChange={(e) => setCallOk(e.target.checked)} /> Vous pouvez m’appeler à ce numéro</label>
                                    <label htmlFor="halte-time" className="sr-only">Moment pour te rappeler</label>
                                    <select id="halte-time" value={bestTime} onChange={(e) => setBestTime(e.target.value)} className={input}>{TIMES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="halte-msg" className={label}>Si tu veux, dis quelques mots</label>
                            <textarea id="halte-msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={4} className={`${input} py-3`} placeholder="Tu n’as pas à donner de détails. Une personne te posera les questions, doucement." />
                        </div>

                        {/* Champ piège pour les robots : invisible et hors du clavier. */}
                        <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
                            <label>Site web<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
                        </div>

                        {error && <p role="alert" className="rounded-2xl bg-red-50 text-red-800 p-3 font-semibold">{error}</p>}
                        <button type="submit" disabled={sending} className="w-full rounded-full bg-brand text-ink font-extrabold text-lg min-h-[60px] shadow disabled:opacity-60">
                            {sending ? 'Envoi…' : 'Envoyer'}
                        </button>
                        <button type="button" onClick={() => setScreen('home')} className="w-full text-sm font-bold underline min-h-[44px]">Retour</button>
                    </form>
                )}

                {screen === 'done' && result && (
                    <>
                        {result.queued ? (
                            <>
                                <h1 className="text-2xl font-extrabold">Pas de réseau pour l’instant</h1>
                                <p className="text-base">Ton message est <strong>gardé sur ce téléphone</strong> et partira tout seul dès que la connexion reviendra. Laisse cette page ouverte si tu peux.</p>
                                {smsHref && (
                                    <a href={smsHref} className="block text-center rounded-full bg-brand font-extrabold min-h-[56px] leading-[56px]">Envoyer un SMS à la place</a>
                                )}
                            </>
                        ) : (
                            <>
                                <h1 className="text-2xl font-extrabold">Merci, c’est envoyé.</h1>
                                <p className="text-base">Tu as bien fait. Une personne formée va lire ton message{callOk && phone ? ' et te rappeler' : ''}.</p>
                                {result.ref && <p className="rounded-2xl bg-white border border-gray-100 p-4 text-center">Ta référence : <strong className="text-xl tracking-wider">{result.ref}</strong><span className="block text-sm text-gray-600">Garde-la si tu veux la donner par téléphone.</span></p>}
                            </>
                        )}
                        <EmergencyNumbers title="Si tu as peur ou si c’est urgent, appelle" />
                        <p className="text-sm text-gray-600">Si quelqu’un peut regarder ton téléphone, touche « Quitter vite » en haut à droite : tu arrives sur une page ordinaire. Pour effacer aussi la trace de cette visite, supprime l’historique de ton navigateur.</p>
                    </>
                )}
            </main>
        </div>
    );
}

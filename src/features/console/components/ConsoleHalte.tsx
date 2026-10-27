// src/features/console/components/ConsoleHalte.tsx — HALTE
// Pour l'équipe : chiffres d'ensemble SANS aucune donnée personnelle, et fabrique des QR codes et affiches.
// Le contenu des alertes n'est lisible que dans l'espace de la cellule d'écoute (compte « isResponder »).
import { useEffect, useState } from 'react';
import { halteCellule, type HalteStats } from '@/features/halte/services/halteService';
import { cleanCode, openPoster, qrSvg, smsUrl, webUrl, callUrl } from '@/features/halte/lib/poster';
import { SMS_NUMBER, publicBaseUrl, NUMBERS_VERIFIED_ON } from '@/features/halte/config';

const Stat = ({ label, value, tone = '' }: { label: string; value: React.ReactNode; tone?: string }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-3.5"><p className={`text-2xl font-bold ${tone || 'text-ink'}`}>{value}</p><p className="text-xs text-gray-500 mt-0.5">{label}</p></div>
);

const download = (name: string, svg: string) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const ConsoleHalte = () => {
    const [stats, setStats] = useState<HalteStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [code, setCode] = useState('EKPE-01');
    const [footer, setFooter] = useState('Vanessa · ASILLIA — avec U-Report by UNICEF Sèmè-Podji');
    const [svgs, setSvgs] = useState<{ web: string; sms: string; call: string }>({ web: '', sms: '', call: '' });
    const [popupBlocked, setPopupBlocked] = useState(false);
    const c = cleanCode(code);

    useEffect(() => { halteCellule.stats().then(setStats).catch((e) => setError(e.message)); }, []);
    useEffect(() => {
        let alive = true;
        Promise.all([qrSvg(webUrl(c)), SMS_NUMBER ? qrSvg(smsUrl(c)) : Promise.resolve(''), qrSvg(callUrl())]).then(([web, sms, call]) => alive && setSvgs({ web, sms, call }));
        return () => { alive = false; };
    }, [c]);

    const max = Math.max(1, ...(stats?.perDay.map((d) => d.n) || [1]));
    return (
        <div className="space-y-5">
            <p className="text-xs text-gray-500 bg-sand rounded-xl p-3">
                Ici, aucun contenu d’alerte : seulement des chiffres. Pour lire et traiter les alertes, la personne doit être nommée « Cellule d’écoute » (attribut <code>isResponder</code> sur son compte), puis ouvrir <strong>/halte/cellule</strong>.
            </p>
            {error && <p className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-700">{error}</p>}

            {stats && (
                <section className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <Stat label="Alertes ouvertes" value={stats.openCount} />
                        <Stat label="Dont urgentes" value={stats.openUrgent} tone={stats.openUrgent ? 'text-red-600' : ''} />
                        <Stat label="Sans réponse depuis plus d’1 h" value={stats.waitingOver1h} tone={stats.waitingOver1h ? 'text-red-600' : ''} />
                        <Stat label="Délai médian avant 1re action" value={stats.medianFirstActionMin === null ? '—' : `${stats.medianFirstActionMin} min`} />
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <p className="text-sm font-bold text-ink mb-2">Alertes par jour (14 derniers jours) — total {stats.total}</p>
                        <div className="flex items-end gap-1 h-20" role="img" aria-label="Alertes par jour">
                            {stats.perDay.map((d) => <div key={d.day} title={`${d.day} : ${d.n}`} className="flex-1 bg-brand rounded-t" style={{ height: `${Math.max(4, (d.n / max) * 100)}%` }} />)}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <p className="text-sm font-bold text-ink mb-2">Quelles affiches fonctionnent ?</p>
                        {stats.byPoster.length === 0 ? <p className="text-sm text-gray-500">Pas encore d’alerte.</p> : (
                            <ul className="divide-y divide-gray-50">{stats.byPoster.map((p) => <li key={p.code} className="flex justify-between py-1.5 text-sm"><span>{p.code === '—' ? 'Sans code d’affiche' : p.code}</span><span className="text-gray-500">{p.n}</span></li>)}</ul>
                        )}
                        <p className="text-xs text-gray-400 mt-2">Canaux : {Object.entries(stats.byChannel).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</p>
                    </div>
                </section>
            )}

            <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <h3 className="font-bold text-ink">QR codes et affiches</h3>
                {(!NUMBERS_VERIFIED_ON) && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">Les numéros d’urgence affichés (138, 117) ne sont pas marqués « vérifiés » dans <code>src/features/halte/config.ts</code>. Appelle-les, puis renseigne la date, avant d’imprimer quoi que ce soit.</p>}
                <p className="text-xs text-gray-500">Les QR pointent vers <strong className="break-all">{publicBaseUrl()}</strong>. Imprime seulement avec le domaine définitif (variable <code>VITE_HALTE_PUBLIC_URL</code>).</p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-ink">Code de l’affiche (lieu / support)
                        <input value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 min-h-[44px] outline-none focus:border-brand font-normal" placeholder="EKPE-MARCHE-01" />
                        <span className="block text-xs text-gray-400 font-normal mt-1">Un code par endroit : on saura quelle affiche a servi. Utilisé : {c || '—'}</span>
                    </label>
                    <label className="text-sm font-semibold text-ink">Pied de l’affiche
                        <input value={footer} onChange={(e) => setFooter(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 min-h-[44px] outline-none focus:border-brand font-normal" />
                    </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    {([['web', 'Écrire en ligne', svgs.web], ['sms', 'Écrire par SMS (sans internet)', svgs.sms], ['call', 'Appeler le 138', svgs.call]] as const).map(([k, title, svg]) => (
                        <div key={k} className="rounded-2xl border border-gray-100 p-3 text-center">
                            {svg ? <div className="w-full max-w-[180px] mx-auto" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="text-xs text-gray-500 py-8">{k === 'sms' ? 'Renseigne VITE_HALTE_SMS_NUMBER pour activer ce QR.' : '…'}</p>}
                            <p className="text-sm font-semibold mt-2">{title}</p>
                            {svg && <button onClick={() => download(`halte-${k}-${c || 'qr'}.svg`, svg)} className="text-xs font-semibold text-ochre mt-1">Télécharger (SVG)</button>}
                        </div>
                    ))}
                </div>
                <button
                    disabled={!c}
                    onClick={async () => setPopupBlocked(!(await openPoster(c, footer)))}
                    className="rounded-xl bg-brand text-ink font-bold px-5 min-h-[48px] disabled:opacity-50"
                >
                    Ouvrir l’affiche A4 à imprimer
                </button>
                {popupBlocked && <p className="text-xs text-red-600">Le navigateur a bloqué la nouvelle fenêtre : autorise les fenêtres pour ce site et recommence.</p>}
                <p className="text-xs text-gray-400">Avant l’impression en masse : scanne chaque QR avec un téléphone Android ET un iPhone, et vérifie que le SMS contient bien « HALTE {c || 'CODE'} ».</p>
            </section>
        </div>
    );
};

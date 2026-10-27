// src/features/moteur/components/ZemReader.tsx — Zem
// Lecteur léger : montre un EXTRAIT de la page indexée (jamais l'article entier) et renvoie
// vers le site d'origine pour la suite — c'est lui qui mérite la visite et les droits.
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { moteurService, type ZemReadPage, type ZemReportReason, type ZemResult } from '../services/moteurService';
import { getSavedRead, saveRead } from '../lib/offlineStore';
import { freshnessLabel, OPEN_SITE } from '../lib/phrases';
import { openExternal } from '../lib/openExternal';
import { ZemRider } from './ZemRider';

export const ZemReader = ({ result, onClose }: { result: ZemResult; onClose: () => void }) => {
    const [page, setPage] = useState<ZemReadPage | null>(null);
    const [error, setError] = useState(false);
    const [offline, setOffline] = useState(false);
    const [reporting, setReporting] = useState<'closed' | 'choose' | 'sent' | 'failed'>('closed');

    useEffect(() => {
        let alive = true;
        moteurService.read(result.id)
            .then((p) => { if (!alive) return; setPage(p); setOffline(false); saveRead(result, p); })
            .catch(() => {
                if (!alive) return;
                // Sans connexion : on relit la version gardée sur l'appareil, si elle existe.
                const saved = getSavedRead(result.id);
                if (saved) { setPage(saved.page); setOffline(true); } else setError(true);
            });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result.id]);

    const sendReport = async (reason: ZemReportReason) => {
        try {
            await moteurService.report(result.id, reason);
            setReporting('sent');
        } catch {
            setReporting('failed');
        }
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const when = freshnessLabel(result.publishedAt);
    const hasSite = /^https?:/.test(result.url);
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 p-0 sm:p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={result.title}
                className="bg-cream w-full sm:max-w-xl max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs text-gray-500">{result.sourceLabel || result.host}{when ? ` · ${when}` : ''}</p>
                        <h2 className="text-lg font-bold text-ink break-words">{result.title}</h2>
                    </div>
                    <button onClick={onClose} aria-label="Fermer" className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-sand">
                        <X size={20} />
                    </button>
                </div>
                <div className="mt-3 text-sm text-gray-700 whitespace-pre-line break-words">
                    {!page && !error && <ZemRider size="sm" bob className="w-14" />}
                    {error && 'Zem n’arrive pas à ouvrir cette page ici. Va directement sur le site.'}
                    {page?.excerpt}
                </div>
                {offline && <p className="text-xs text-ochre mt-2">Version gardée sur ton téléphone (pas de connexion).</p>}
                {page?.truncated && hasSite && <p className="text-xs text-gray-400 mt-2">Extrait — la suite est sur le site d’origine.</p>}
                {hasSite && (
                    <button
                        onClick={() => openExternal(result.url)}
                        className="mt-4 w-full rounded-full bg-brand text-ink font-bold min-h-[48px]"
                    >
                        {OPEN_SITE} ({result.host}) ↗
                    </button>
                )}
                {!offline && (
                    <div className="mt-3 text-center">
                        {reporting === 'closed' && (
                            <button onClick={() => setReporting('choose')} className="text-xs text-gray-500 underline min-h-[44px]">Signaler un problème avec ce résultat</button>
                        )}
                        {reporting === 'choose' && (
                            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Que se passe-t-il ?">
                                {([['faux', 'Information fausse'], ['depasse', 'Dépassée'], ['inapproprie', 'Inapproprié']] as const).map(([r, label]) => (
                                    <button key={r} onClick={() => sendReport(r)} className="rounded-full border border-gray-200 bg-white px-3 min-h-[40px] text-xs font-semibold text-ink hover:bg-sand">{label}</button>
                                ))}
                            </div>
                        )}
                        {reporting === 'sent' && <p className="text-xs text-green-700">Merci, l’équipe va regarder.</p>}
                        {reporting === 'failed' && <p className="text-xs text-red-700">Signalement impossible pour l’instant.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

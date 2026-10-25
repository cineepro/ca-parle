// src/features/moteur/components/ZemReader.tsx — Zem
// Lecteur léger : montre un EXTRAIT de la page indexée (jamais l'article entier) et renvoie
// vers le site d'origine pour la suite — c'est lui qui mérite la visite et les droits.
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { moteurService, type ZemReadPage, type ZemResult } from '../services/moteurService';
import { freshnessLabel, OPEN_SITE } from '../lib/phrases';
import { openExternal } from '../lib/openExternal';
import { ZemRider } from './ZemRider';

export const ZemReader = ({ result, onClose }: { result: ZemResult; onClose: () => void }) => {
    const [page, setPage] = useState<ZemReadPage | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        moteurService.read(result.id).then((p) => alive && setPage(p)).catch(() => alive && setError(true));
        return () => { alive = false; };
    }, [result.id]);

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
                {page?.truncated && hasSite && <p className="text-xs text-gray-400 mt-2">Extrait — la suite est sur le site d’origine.</p>}
                {hasSite && (
                    <button
                        onClick={() => openExternal(result.url)}
                        className="mt-4 w-full rounded-full bg-brand text-ink font-bold min-h-[48px]"
                    >
                        {OPEN_SITE} ({result.host}) ↗
                    </button>
                )}
            </div>
        </div>
    );
};

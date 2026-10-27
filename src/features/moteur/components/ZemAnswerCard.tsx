// src/features/moteur/components/ZemAnswerCard.tsx — Zem
// « Réponse rapide » : des phrases recopiées des meilleures pages, chacune avec sa source.
// Ce n'est pas une IA : Zem ne reformule rien et renvoie toujours vers le site.
import type { ZemAnswer } from '../services/moteurService';
import { openExternal } from '../lib/openExternal';

export const ZemAnswerCard = ({ answer }: { answer: ZemAnswer }) => (
    <section className="mb-3 rounded-3xl bg-white border border-brand/60 p-4" aria-label="Réponse rapide">
        <h2 className="text-sm font-bold text-ochre">Réponse rapide</h2>
        <ul className="mt-2 space-y-3">
            {answer.points.map((p, i) => (
                <li key={p.source.id} className="text-sm text-ink">
                    <span className="break-words">{p.text}</span>{' '}
                    <button
                        onClick={() => /^https?:/.test(p.source.url) && openExternal(p.source.url)}
                        className="align-baseline text-xs font-semibold text-ochre underline"
                        aria-label={`Source ${i + 1} : ${p.source.sourceLabel}`}
                    >
                        [{i + 1}] {p.source.sourceLabel}
                    </button>
                </li>
            ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">Phrases recopiées des pages ci-dessous, sans reformulation. Vérifie toujours sur le site d’origine.</p>
    </section>
);

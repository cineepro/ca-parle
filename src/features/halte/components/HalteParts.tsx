// src/features/halte/components/HalteParts.tsx — HALTE
import { Phone, X } from 'lucide-react';
import { EMERGENCY_NUMBERS, EXIT_URL, localContacts, type HalteNumber } from '../config';

/** Toujours visible : remplace cette page par un site neutre (le bouton « retour » ne la rouvre pas). */
export const QuickExit = () => (
    <button
        type="button"
        onClick={() => window.location.replace(EXIT_URL)}
        className="fixed top-3 right-3 z-50 inline-flex items-center gap-1.5 rounded-full bg-ink text-white font-bold text-sm px-4 min-h-[44px] shadow-lg"
        aria-label="Quitter vite cette page"
    >
        <X size={16} aria-hidden /> Quitter vite
    </button>
);

const CallRow = ({ n }: { n: HalteNumber }) => (
    <a
        href={`tel:${n.number.replace(/\s/g, '')}`}
        className="flex items-center gap-3 rounded-2xl bg-white border border-red-200 px-4 min-h-[64px] active:bg-red-50"
    >
        <span className="shrink-0 w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center"><Phone size={20} aria-hidden /></span>
        <span className="min-w-0">
            <span className="block text-lg font-extrabold text-ink">Appeler le {n.number}</span>
            <span className="block text-sm text-gray-600">{n.label}{n.detail ? ` — ${n.detail}` : ''}</span>
        </span>
    </a>
);

export const EmergencyNumbers = ({ title = 'En danger tout de suite ? Appelle.' }: { title?: string }) => (
    <section aria-label="Numéros d’urgence" className="rounded-3xl bg-red-50 border border-red-200 p-4 space-y-2">
        <h2 className="font-extrabold text-red-800">{title}</h2>
        {EMERGENCY_NUMBERS.map((n) => <CallRow key={n.number} n={n} />)}
        {localContacts().map((n) => <CallRow key={n.number} n={n} />)}
    </section>
);

export const Choice = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={`flex-1 rounded-2xl border-2 px-3 min-h-[56px] font-bold text-base text-left transition-colors ${
            selected ? 'bg-brand border-ink text-ink' : 'bg-white border-gray-200 text-ink hover:bg-sand'
        }`}
    >
        {children}
    </button>
);

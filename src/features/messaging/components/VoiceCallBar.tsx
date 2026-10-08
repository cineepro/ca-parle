// src/features/messaging/components/VoiceCallBar.tsx — Vanessa
// Barre affichée à la place du composeur pendant un appel avec Vanessa.
// La conversation reste visible au-dessus : chaque échange y apparaît (et
// reste réécoutable) ; ici, seulement l'état de l'appel et les dernières
// phrases en sous-titres, pour pouvoir suivre à l'écrit en parlant.
import type { VoicePhase, VoiceNotice } from '../hooks/useVoiceConversation';

const PHASE_LABEL: Record<VoicePhase, string> = {
    off: '',
    paused: 'En pause',
    listening: "À l'écoute",
    recording: 'Je t\u2019écoute...',
    processing: 'Vanessa réfléchit...',
    speaking: 'Vanessa parle',
};
const PHASE_DOT: Record<VoicePhase, string> = {
    off: 'bg-gray-300',
    paused: 'bg-gray-400',
    listening: 'bg-sky-300',
    recording: 'bg-red-500',
    processing: 'bg-amber-400',
    speaking: 'bg-brand',
};

interface Props {
    phase: VoicePhase;
    notice: VoiceNotice;
    micError: string | null;
    sendError: string | null;
    userLine?: string;
    vanessaLine?: string;
    onPause: () => void;
    onResume: () => void;
    onEnd: () => void;
}

export const VoiceCallBar = ({ phase, notice, micError, sendError, userLine, vanessaLine, onPause, onResume, onEnd }: Props) => (
    <div className="bg-white border-t border-gray-100 px-4 py-3 space-y-2.5">
        {(userLine || vanessaLine) && (
            <div className="space-y-1">
                {userLine && <p className="text-xs text-gray-500 line-clamp-2"><span className="font-semibold">Toi — </span>{userLine}</p>}
                {vanessaLine && <p className="text-sm text-gray-800 line-clamp-3"><span className="font-semibold text-ochre">Vanessa — </span>{vanessaLine}</p>}
            </div>
        )}

        <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
                {(phase === 'listening' || phase === 'recording') && (
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${PHASE_DOT[phase]}`} />
                )}
                <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${PHASE_DOT[phase]}`} />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{PHASE_LABEL[phase]}</p>
                <p className="text-xs text-gray-400">
                    {phase === 'paused' ? "Rien n'est écouté ni envoyé." : 'Parle normalement, fais une pause : elle te répond.'}
                </p>
            </div>
            {phase === 'paused' ? (
                <button onClick={onResume} className="shrink-0 rounded-full bg-brand hover:bg-brand-hover text-ink text-xs font-bold px-4 py-2.5">
                    Reprendre
                </button>
            ) : (
                <button onClick={onPause} className="shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold px-4 py-2.5">
                    Pause
                </button>
            )}
            <button onClick={onEnd} className="shrink-0 rounded-full bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-4 py-2.5">
                Raccrocher
            </button>
        </div>

        {micError && <p className="text-xs text-red-500">{micError}</p>}
        {sendError && <p className="text-xs text-red-500 font-semibold">{sendError}</p>}
        {notice === 'timeout' && (
            <p className="text-xs text-amber-600">Vanessa n'a pas répondu à temps. Tu peux parler de nouveau.</p>
        )}
        {notice === 'text-reply' && (
            <p className="text-xs text-amber-600">
                Vanessa a répondu par écrit (voix indisponible ou limite du jour atteinte). Sa réponse est dans la conversation.
            </p>
        )}
    </div>
);
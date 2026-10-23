// src/features/moteur/components/ZemTrack.tsx — Zem
// La « route » de la recherche : pendant qu'on cherche, le zem roule de gauche à droite.
// Il démarre vite puis ralentit vers 88 % (on ne peut pas savoir à l'avance quand la réponse
// arrive) ; dès que les résultats sont là, il fonce jusqu'au bout et la route disparaît.
import { useEffect, useRef, useState } from 'react';
import { ZemRider } from './ZemRider';

export type TrackState = 'idle' | 'loading' | 'done';

const RIDER_W = 56; // largeur du motard en px (sert à ne pas dépasser le bord)

export const ZemTrack = ({ state, line }: { state: TrackState; line?: string }) => {
    const [pos, setPos] = useState(0); // 0..1
    const [phase, setPhase] = useState<'hidden' | 'run' | 'finish'>('hidden');
    const raf = useRef<number | null>(null);
    const hideTimer = useRef<number | null>(null);

    useEffect(() => {
        if (raf.current) cancelAnimationFrame(raf.current);
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
        if (state === 'loading') {
            setPhase('hidden');
            setPos(0);
            // Deux images : d'abord placé au départ SANS transition, puis lancé.
            raf.current = requestAnimationFrame(() => {
                raf.current = requestAnimationFrame(() => { setPhase('run'); setPos(0.88); });
            });
        } else if (state === 'done') {
            setPhase('finish');
            setPos(1);
            hideTimer.current = window.setTimeout(() => setPhase('hidden'), 900);
        } else {
            setPhase('hidden');
            setPos(0);
        }
        return () => {
            if (raf.current) cancelAnimationFrame(raf.current);
            if (hideTimer.current) window.clearTimeout(hideTimer.current);
        };
    }, [state]);

    const visible = state !== 'idle' && (phase !== 'hidden' || state === 'loading');
    const transition = phase === 'run' ? 'left 7s cubic-bezier(0.12, 0.8, 0.25, 1)' : phase === 'finish' ? 'left 0.35s ease-in, opacity 0.5s ease 0.4s' : 'none';

    return (
        <div
            role="progressbar"
            aria-label="Recherche en cours"
            aria-busy={state === 'loading'}
            aria-valuemin={0}
            aria-valuemax={100}
            className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ height: 56 }}
        >
            <div className="relative h-full">
                {/* La route */}
                <div className={`absolute left-0 right-0 bottom-1 h-[3px] rounded-full ${state === 'loading' ? 'zem-road' : 'bg-sand'}`} />
                {/* Le zem */}
                <div
                    className="absolute bottom-1"
                    style={{
                        left: `calc((100% - ${RIDER_W}px) * ${pos})`,
                        width: RIDER_W,
                        transition,
                        opacity: phase === 'finish' && pos === 1 ? 0 : 1,
                    }}
                >
                    <ZemRider size="sm" bob={state === 'loading'} />
                </div>
            </div>
            {line && state === 'loading' && <p className="sr-only" aria-live="polite">{line}</p>}
        </div>
    );
};

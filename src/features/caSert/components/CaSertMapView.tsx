// src/features/caSert/components/CaSertMapView.tsx — Ça Parle
import { useEffect, useRef, useState } from 'react';
import maplibregl from '../lib/maplibreWorker';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Spot } from '../services/caSertService';
import { SpotCard } from './SpotCard';
import { SPOT_CATEGORIES } from '../config/categories';

interface Props {
    spots: Spot[];
}

const BENIN_CENTER: [number, number] = [2.42, 9.3];
const BENIN_ZOOMED: [number, number] = [2.42, 6.38];

export const CaSertMapView = ({ spots }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const [entered, setEntered] = useState(false);
    const [selected, setSelected] = useState<Spot | null>(null);
    const [contextLost, setContextLost] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const spinFrame = useRef<number | null>(null);

    // Seules les fiches avec une vraie position posée par leur auteur
    // apparaissent sur la carte — les plus anciennes, créées avant ce
    // système, restent simplement invisibles ici (mais toujours visibles
    // en mode liste).
    const locatable = spots.filter((s) => s.latitude != null && s.longitude != null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        setContextLost(false);

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: BENIN_CENTER,
            zoom: 1.15,
            attributionControl: { compact: true },
        });
        map.scrollZoom.disable();
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();

        map.on('style.load', () => map.setProjection({ type: 'globe' }));

        // Le GPU peut "perdre" son contexte graphique à tout moment —
        // souvent sans rapport avec notre code (mémoire vidéo saturée,
        // bascule d'onglet, appareil bas de gamme...). MapLibre tente de
        // s'auto-restaurer, mais si rien ne se passe après un court délai,
        // on propose une vraie reconstruction plutôt que de laisser
        // l'écran blanc indéfiniment.
        let restored = false;
        map.on('webglcontextrestored', () => { restored = true; });
        map.on('webglcontextlost', (e: any) => {
            e?.preventDefault?.();
            restored = false;
            setTimeout(() => {
                if (!restored) setContextLost(true);
            }, 2500);
        });

        mapRef.current = map;

        const spin = () => {
            if (!mapRef.current || mapRef.current !== map) return;
            const c = map.getCenter();
            map.easeTo({ center: [c.lng + 0.3, c.lat], duration: 16, easing: (t: number) => t });
            spinFrame.current = requestAnimationFrame(() => setTimeout(spin, 16));
        };
        map.on('load', spin);

        return () => {
            if (spinFrame.current) cancelAnimationFrame(spinFrame.current);
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retryCount]);

    const handleRetry = () => {
        // Force la recréation complète de la carte — le simple événement
        // "restored" ne suffit pas toujours à redessiner correctement une
        // scène 3D après une vraie perte de contexte.
        setContextLost(false);
        setEntered(false);
        setRetryCount((n) => n + 1);
    };

    // Pose les repères une fois entré dans la carte, et à chaque
    // changement de la liste (nouvelle fiche validée par exemple).
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !entered) return;

        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        locatable.forEach((spot) => {
            const category = SPOT_CATEGORIES.find((c) => c.slug === spot.category);
            const el = document.createElement('div');
            el.textContent = category?.icon || '📍';
            el.style.fontSize = '22px';
            el.style.cursor = 'pointer';
            el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))';
            el.addEventListener('click', () => setSelected(spot));

            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([spot.longitude!, spot.latitude!])
                .addTo(map);
            markersRef.current.push(marker);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entered, spots]);

    const handleEnter = () => {
        setEntered(true);
        const map = mapRef.current;
        if (!map) return;
        map.dragRotate.enable();
        map.scrollZoom.enable();
        map.flyTo({ center: BENIN_ZOOMED, zoom: 11, pitch: 40, duration: 2600, essential: true });
    };

    return (
        <div className="relative w-full h-[calc(100vh-180px)] min-h-[420px] rounded-2xl overflow-hidden">
            <div ref={containerRef} className="absolute inset-0" />

            {contextLost && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-gray-900/95 px-6 text-center">
                    <div className="text-3xl">🔌</div>
                    <p className="text-white text-sm">
                        La carte a été interrompue par ton appareil (mémoire graphique saturée, souvent après avoir
                        déjà ouvert une carte juste avant).
                    </p>
                    <button
                        onClick={handleRetry}
                        className="bg-[#FF4757] hover:bg-[#e63e4d] text-white font-bold text-sm px-6 py-3 rounded-full"
                    >
                        🔄 Réessayer
                    </button>
                </div>
            )}

            {!entered && !contextLost && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-10 px-6 bg-gradient-to-t from-black/40 via-transparent to-transparent">
                    <p className="text-white/80 text-sm text-center max-w-xs mb-4">
                        {locatable.length > 0
                            ? `${locatable.length} bon${locatable.length > 1 ? 's' : ''} plan${locatable.length > 1 ? 's' : ''} placé${locatable.length > 1 ? 's' : ''} sur la carte.`
                            : "Aucun bon plan localisé pour l'instant — sois le premier."}
                    </p>
                    <button
                        onClick={handleEnter}
                        className="bg-[#FF4757] hover:bg-[#e63e4d] text-white font-bold text-sm px-7 py-3.5 rounded-full shadow-lg transition-colors"
                    >
                        Découvrir la carte
                    </button>
                </div>
            )}

            {selected && (
                <div className="absolute left-3 right-3 bottom-3 z-10 max-w-sm">
                    <div className="relative">
                        <button
                            onClick={() => setSelected(null)}
                            className="absolute -top-3 -right-3 z-20 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 text-sm"
                        >
                            ✕
                        </button>
                        <SpotCard spot={selected} />
                    </div>
                </div>
            )}
        </div>
    );
};
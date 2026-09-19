// src/features/caSert/components/CaSertMapView.tsx — Ça Parle
import { useEffect, useRef, useState } from 'react';
import maplibregl from '../lib/maplibreWorker';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Spot } from '../services/caSertService';
import { routeService } from '../services/routeService';
import { SpotCard } from './SpotCard';
import { SPOT_CATEGORIES } from '../config/categories';
import { FUNCTIONS } from '@/api/constants';

interface Props {
    spots: Spot[];
}

const BENIN_CENTER: [number, number] = [2.42, 9.3];
const BENIN_ZOOMED: [number, number] = [2.42, 6.38];
const SPOT_ZOOM = 15; // niveau de zoom pour bien voir un lieu précis, pas juste la ville
const ROUTE_SOURCE_ID = 'ca-sert-route';
const ROUTE_LAYER_ID = 'ca-sert-route-line';

const RLOG = (...args: any[]) => console.log('[CaSertRoute]', ...args);

export const CaSertMapView = ({ spots }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);
    const [entered, setEntered] = useState(false);
    const [selected, setSelected] = useState<Spot | null>(null);
    const [contextLost, setContextLost] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [locating, setLocating] = useState(false);
    const [routing, setRouting] = useState(false);
    const [routeInfo, setRouteInfo] = useState<{ distanceKm: string; durationMin: number } | null>(null);
    const [routeError, setRouteError] = useState<string | null>(null);
    const spinFrame = useRef<number | null>(null);
    const spinTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const spinningRef = useRef(true);

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
        map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');

        map.on('style.load', () => map.setProjection({ type: 'globe' }));

        // Le GPU peut "perdre" son contexte graphique à tout moment —
        // souvent sans rapport avec notre code. MapLibre tente de
        // s'auto-restaurer ; si rien ne se passe après un court délai, on
        // propose une vraie reconstruction plutôt qu'un écran figé.
        let restored = false;
        map.on('webglcontextrestored', () => { restored = true; });
        map.on('webglcontextlost', (e: any) => {
            e?.preventDefault?.();
            restored = false;
            setTimeout(() => { if (!restored) setContextLost(true); }, 2500);
        });

        mapRef.current = map;
        spinningRef.current = true;

        // ⚠️ La rotation d'introduction doit impérativement s'arrêter dès
        // le passage à la carte plate (voir handleEnter) — sinon elle
        // continue de tourner en arrière-plan et empêche tout déplacement
        // de caméra de se stabiliser. cancelAnimationFrame seul ne suffit
        // pas : il faut aussi annuler le setTimeout imbriqué dedans.
        const spin = () => {
            if (!spinningRef.current || !mapRef.current || mapRef.current !== map) return;
            const c = map.getCenter();
            map.easeTo({ center: [c.lng + 0.3, c.lat], duration: 16, easing: (t: number) => t });
            spinFrame.current = requestAnimationFrame(() => {
                spinTimeout.current = setTimeout(spin, 16);
            });
        };
        map.on('load', spin);

        return () => {
            spinningRef.current = false;
            if (spinTimeout.current) clearTimeout(spinTimeout.current);
            if (spinFrame.current) cancelAnimationFrame(spinFrame.current);
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retryCount]);

    const handleRetry = () => {
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
            el.addEventListener('click', () => handleSelectSpot(spot));

            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([spot.longitude!, spot.latitude!])
                .addTo(map);
            markersRef.current.push(marker);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entered, spots]);

    const handleEnter = () => {
        // Priorité absolue : couper la rotation AVANT toute autre chose —
        // tant qu'elle continue en arrière-plan, elle se bat avec le
        // déplacement de caméra qui suit.
        spinningRef.current = false;
        if (spinFrame.current) cancelAnimationFrame(spinFrame.current);
        if (spinTimeout.current) clearTimeout(spinTimeout.current);

        setEntered(true);
        const map = mapRef.current;
        if (!map) return;
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation();
        map.scrollZoom.enable();

        // Le passage globe → carte plate PENDANT un flyTo s'est avéré
        // instable — on force donc la projection à plat D'ABORD,
        // séparément, puis on anime le déplacement sur une carte déjà en
        // mode standard.
        map.setProjection({ type: 'mercator' });
        map.resize();
        requestAnimationFrame(() => {
            map.flyTo({ center: BENIN_ZOOMED, zoom: 11, pitch: 40, duration: 2600, essential: true });
        });
    };

    // Zoome sur le lieu choisi pour une vraie vue rapprochée — pas juste
    // le niveau "ville" du survol général.
    const handleSelectSpot = (spot: Spot) => {
        setSelected(spot);
        setRouteInfo(null);
        setRouteError(null);
        clearRoute();
        const map = mapRef.current;
        if (map && spot.latitude != null && spot.longitude != null) {
            map.flyTo({ center: [spot.longitude, spot.latitude], zoom: SPOT_ZOOM, pitch: 45, duration: 1200 });
        }
    };

    const clearRoute = () => {
        const map = mapRef.current;
        if (!map) return;
        if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
        if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
    };

    // Demande la position réelle de l'utilisateur — nécessite son
    // autorisation explicite (le navigateur affiche sa propre demande de
    // permission, on ne peut ni la forcer ni la contourner).
    // Accepte un callback optionnel, déclenché une fois la position
    // obtenue — c'est ce qui permet à handleShowRoute d'enchaîner
    // automatiquement sur le calcul de l'itinéraire, sans exiger un
    // second clic une fois la localisation terminée.
    const handleLocateMe = (onDone?: (lat: number, lng: number) => void) => {
        RLOG('handleLocateMe appelé — navigator.geolocation disponible ?', !!navigator.geolocation);
        if (!navigator.geolocation) {
            setRouteError("La géolocalisation n'est pas disponible sur cet appareil.");
            return;
        }
        setLocating(true);
        setRouteError(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                RLOG('✅ Position obtenue :', lat, lng, '— callback onDone fourni ?', !!onDone);
                setUserPosition({ lat, lng });
                setLocating(false);

                const map = mapRef.current;
                if (map) {
                    if (userMarkerRef.current) userMarkerRef.current.remove();
                    const el = document.createElement('div');
                    el.style.width = '16px';
                    el.style.height = '16px';
                    el.style.borderRadius = '50%';
                    el.style.background = '#4285F4';
                    el.style.border = '3px solid white';
                    el.style.boxShadow = '0 0 0 4px rgba(66,133,244,0.3), 0 2px 6px rgba(0,0,0,0.3)';
                    userMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
                }
                RLOG('Appel du callback onDone maintenant...');
                onDone?.(lat, lng);
            },
            (err) => {
                RLOG('❌ Échec de la géolocalisation — code:', err.code, '— message:', err.message);
                setLocating(false);
                setRouteError(
                    err.code === err.PERMISSION_DENIED
                        ? "Localisation refusée — active-la dans les paramètres de ton navigateur pour tracer un itinéraire."
                        : 'Impossible de récupérer ta position pour le moment.'
                );
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Trace l'itinéraire routier réel entre la position de l'utilisateur
    // et le lieu sélectionné, façon Google Maps. Si la position n'est pas
    // encore connue, la demande puis enchaîne directement sur le calcul —
    // un seul clic suffit, pas besoin de cliquer deux fois.
    const handleShowRoute = async (fromLat?: number, fromLng?: number) => {
        RLOG('handleShowRoute appelé avec', fromLat, fromLng, '— selected ?', !!selected, '— FUNCTIONS.GET_ROUTE =', JSON.stringify(FUNCTIONS.GET_ROUTE));
        if (!selected || selected.latitude == null || selected.longitude == null) {
            RLOG('❌ Arrêt : pas de fiche sélectionnée ou sans coordonnées.');
            return;
        }

        const lat = fromLat ?? userPosition?.lat;
        const lng = fromLng ?? userPosition?.lng;
        if (lat == null || lng == null) {
            RLOG('Pas de position connue — déclenchement de handleLocateMe...');
            handleLocateMe((l, g) => handleShowRoute(l, g));
            return;
        }

        if (!FUNCTIONS.GET_ROUTE) {
            RLOG('❌❌❌ FUNCTIONS.GET_ROUTE est VIDE — la variable VITE_APPWRITE_FUNCTION_GET_ROUTE n\'est pas dans ce build. Il faut redéployer après l\'avoir ajoutée.');
            setRouteError("Configuration manquante (VITE_APPWRITE_FUNCTION_GET_ROUTE) — le site doit être reconstruit après l'ajout de cette variable.");
            return;
        }

        RLOG('Départ de l\'appel routeService.getRoute avec', lat, lng, '→', selected.latitude, selected.longitude);
        setRouting(true);
        setRouteError(null);
        try {
            const result = await routeService.getRoute(lat, lng, selected.latitude, selected.longitude);
            RLOG('✅ Réponse reçue de get-route :', result);
            const map = mapRef.current;
            if (!map) return;

            clearRoute();
            map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: result.geometry } });
            map.addLayer({
                id: ROUTE_LAYER_ID,
                type: 'line',
                source: ROUTE_SOURCE_ID,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#4285F4', 'line-width': 5, 'line-opacity': 0.85 },
            });

            setRouteInfo({ distanceKm: result.distanceKm, durationMin: result.durationMin });

            // Cadre la vue pour voir le trajet en entier, du départ à l'arrivée.
            const coords = result.geometry.coordinates as [number, number][];
            const bounds = coords.reduce(
                (b, coord) => b.extend(coord as [number, number]),
                new maplibregl.LngLatBounds(coords[0], coords[0])
            );
            map.fitBounds(bounds, { padding: 60, pitch: 0, duration: 1200 });
        } catch (err: any) {
            RLOG('❌ Erreur attrapée :', err.message, err);
            setRouteError(err.message || "Impossible de calculer l'itinéraire.");
        } finally {
            setRouting(false);
        }
    };

    return (
        <div className="relative w-full">
            <div
                ref={containerRef}
                className="w-full h-[480px] rounded-2xl overflow-hidden border border-gray-200 bg-gray-100"
            />

            {contextLost && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-gray-900/95 px-6 text-center rounded-2xl">
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
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-10 px-6 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-2xl">
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

            {/* Bouton "Ma position" — visible une fois entré dans la carte. */}
            {entered && !contextLost && (
                <button
                    onClick={() => handleLocateMe()}
                    disabled={locating}
                    className="absolute top-3 left-3 z-10 bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center text-lg disabled:opacity-50"
                    title="Me localiser"
                >
                    {locating ? '⏳' : '📍'}
                </button>
            )}

            {selected && (
                <div className="absolute left-3 right-3 bottom-3 z-10 max-w-sm space-y-2">
                    <div className="relative">
                        <button
                            onClick={() => { setSelected(null); clearRoute(); setRouteInfo(null); }}
                            className="absolute -top-3 -right-3 z-20 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 text-sm"
                        >
                            ✕
                        </button>
                        <SpotCard spot={selected} />
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-3">
                        {routeInfo ? (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-700 font-semibold">
                                    🚗 {routeInfo.distanceKm} km · {routeInfo.durationMin} min
                                </span>
                                <button onClick={() => handleShowRoute()} className="text-xs text-[#4285F4] font-semibold">Actualiser</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleShowRoute()}
                                disabled={routing || locating}
                                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-[#4285F4] disabled:opacity-50"
                            >
                                {routing ? '⏳ Calcul de l\'itinéraire...' : locating ? '⏳ Localisation...' : '🧭 Itinéraire depuis ma position'}
                            </button>
                        )}
                        {routeError && <p className="text-xs text-red-500 mt-1">{routeError}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};
// src/features/uac/components/CampusMap.tsx — Vanessa
// Carte du campus : on choisit un lieu (liste, recherche ou repère) et on est guidé jusqu'à lui.
import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from '@/features/caSert/lib/maplibreWorker';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Crosshair, Navigation, Search, X } from 'lucide-react';
import { routeService } from '@/features/caSert/services/routeService';
import { geolocationService } from '@/services/geolocationService';
import { CAMPUS_CENTER, CAMPUS_ZOOM, PLACE_KINDS, type PlaceKind } from '../config';
import { uacService, type UacPlace } from '../services/uacService';
import { WALKING_MAX_M, distanceMeters, mapsLink, normalize } from '../lib/geo';

const ROUTE_SOURCE = 'uac-route';
const ROUTE_LAYER = 'uac-route-line';
const KIND = Object.fromEntries(PLACE_KINDS.map((k) => [k.slug, k]));

export const CampusMap = ({ onClose }: { onClose: () => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);
    const stopWatchRef = useRef<(() => void) | null>(null);

    const [places, setPlaces] = useState<UacPlace[]>([]);
    const [loading, setLoading] = useState(true);
    const [kind, setKind] = useState<PlaceKind | 'tout'>('tout');
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<UacPlace | null>(null);
    const [busy, setBusy] = useState(false);
    const [info, setInfo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tracking, setTracking] = useState(false);

    const visible = useMemo(() => {
        const q = normalize(query.trim());
        return places.filter((p) => (kind === 'tout' || p.kind === kind) && (!q || normalize(p.name).includes(q)));
    }, [places, kind, query]);

    useEffect(() => {
        uacService.listPlaces().then(setPlaces).catch(() => setError('Impossible de charger les lieux pour l’instant.')).finally(() => setLoading(false));
    }, []);

    // Création de la carte, une seule fois.
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        const map = new maplibregl.Map({
            container: containerRef.current,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: CAMPUS_CENTER,
            zoom: CAMPUS_ZOOM,
            attributionControl: { compact: true },
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;
        const markers = markersRef.current;
        return () => {
            stopWatchRef.current?.();
            markers.clear();
            map.remove();
            mapRef.current = null;
        };
    }, []);

    const clearRoute = () => {
        const map = mapRef.current;
        if (!map) return;
        if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
        if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
    };

    const select = (p: UacPlace | null) => {
        setSelected(p);
        setInfo(null);
        setError(null);
        clearRoute();
        if (p) mapRef.current?.flyTo({ center: [p.longitude, p.latitude], zoom: 17, duration: 900 });
    };

    // Repères : un par lieu visible ; le lieu choisi est mis en évidence.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        markersRef.current.forEach((m) => m.remove());
        markersRef.current.clear();
        visible.forEach((p) => {
            const el = document.createElement('button');
            el.type = 'button';
            el.setAttribute('aria-label', p.name);
            el.textContent = KIND[p.kind]?.icon || '📍';
            el.style.cssText = `font-size:${selected?.$id === p.$id ? 30 : 22}px;line-height:1;cursor:pointer;background:none;border:0;padding:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))`;
            el.addEventListener('click', () => select(p));
            markersRef.current.set(p.$id, new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.longitude, p.latitude]).addTo(map));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, selected]);

    const showUser = (lat: number, lng: number) => {
        const map = mapRef.current;
        if (!map) return;
        if (userMarkerRef.current) { userMarkerRef.current.setLngLat([lng, lat]); return; }
        const el = document.createElement('div');
        el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 0 0 4px rgba(66,133,244,.3),0 2px 6px rgba(0,0,0,.3)';
        userMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    };

    const drawRoute = (geometry: GeoJSON.LineString) => {
        const map = mapRef.current;
        if (!map) return;
        clearRoute();
        map.addSource(ROUTE_SOURCE, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry } });
        map.addLayer({ id: ROUTE_LAYER, type: 'line', source: ROUTE_SOURCE, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#964F08', 'line-width': 6, 'line-opacity': 0.9 } });
        const coords = geometry.coordinates as [number, number][];
        const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: { top: 120, bottom: 280, left: 40, right: 40 }, duration: 900 });
    };

    const goThere = async () => {
        if (!selected || busy) return;
        setBusy(true); setError(null); setInfo(null);
        try {
            const pos = await geolocationService.getCurrentPosition();
            showUser(pos.lat, pos.lng);
            const far = distanceMeters(pos, { lat: selected.latitude, lng: selected.longitude }) > WALKING_MAX_M;
            const r = await routeService.getRoute(pos.lat, pos.lng, selected.latitude, selected.longitude, far ? 'driving-car' : 'foot-walking');
            drawRoute(r.geometry);
            setInfo(`${r.distanceKm} km · environ ${r.durationMin} min ${far ? 'en voiture (tu es loin du campus)' : 'à pied'}`);
        } catch (e) {
            setError(e instanceof Error && e.message && !e.message.includes('échoué')
                ? e.message
                : 'Je n’arrive pas à te localiser ou à calculer le trajet. Autorise la localisation, ou ouvre l’itinéraire dans Google Maps.');
        } finally {
            setBusy(false);
        }
    };

    const toggleTracking = async () => {
        if (tracking) { stopWatchRef.current?.(); stopWatchRef.current = null; setTracking(false); return; }
        setTracking(true);
        try {
            stopWatchRef.current = await geolocationService.watchPosition(
                ({ lat, lng }) => { showUser(lat, lng); mapRef.current?.easeTo({ center: [lng, lat], duration: 800 }); },
                () => { setError('Suivi interrompu : vérifie que la localisation reste autorisée.'); setTracking(false); },
            );
        } catch { setTracking(false); setError('Impossible d’activer le suivi en direct.'); }
    };

    return (
        <div className="fixed inset-0 z-50 bg-cream flex flex-col" role="dialog" aria-modal="true" aria-label="Carte du campus">
            <div ref={containerRef} className="absolute inset-0" />

            <div className="relative z-10 p-3 space-y-2 bg-gradient-to-b from-cream via-cream/95 to-transparent pb-6">
                <div className="mx-auto max-w-[480px] flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-full bg-white border border-gray-300 px-3 py-2">
                        <Search className="w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un lieu (amphi, banque…)" aria-label="Chercher un lieu" className="w-full text-sm text-ink bg-transparent focus:outline-none" />
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fermer la carte" className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center"><X className="w-5 h-5" /></button>
                </div>
                <div className="mx-auto max-w-[480px] flex gap-2 overflow-x-auto scrollbar-hide" role="group" aria-label="Types de lieux">
                    {[{ slug: 'tout' as const, name: 'Tout', icon: '🗺️' }, ...PLACE_KINDS].map((k) => (
                        <button key={k.slug} type="button" aria-pressed={kind === k.slug} onClick={() => setKind(k.slug)}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${kind === k.slug ? 'bg-brand text-ink' : 'bg-white text-gray-700 border border-gray-300'}`}>
                            <span aria-hidden="true">{k.icon}</span> {k.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative z-10 mt-auto">
                <div className="mx-auto max-w-[480px] rounded-t-3xl bg-cream shadow-[0_-4px_20px_rgba(0,0,0,.15)] p-4 max-h-[46dvh] overflow-y-auto">
                    {selected ? (
                        <div className="space-y-3">
                            <div className="flex items-start gap-2">
                                <span className="text-2xl" aria-hidden="true">{KIND[selected.kind]?.icon}</span>
                                <div className="min-w-0 mr-auto">
                                    <p className="font-bold text-ink break-words">{selected.name}</p>
                                    <p className="text-xs text-gray-500">{KIND[selected.kind]?.name}</p>
                                    {selected.description && <p className="mt-1 text-sm text-gray-700 break-words">{selected.description}</p>}
                                </div>
                                <button type="button" onClick={() => select(null)} className="text-sm font-semibold text-ochre shrink-0">← Liste</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={goThere} disabled={busy} className="flex items-center gap-1.5 rounded-full bg-brand text-ink text-sm font-bold px-4 py-2.5 disabled:opacity-60">
                                    <Navigation className="w-4 h-4" aria-hidden="true" /> {busy ? 'Calcul…' : 'Y aller'}
                                </button>
                                <button type="button" onClick={toggleTracking} aria-pressed={tracking} className={`flex items-center gap-1.5 rounded-full text-sm font-semibold px-4 py-2.5 border ${tracking ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-gray-300'}`}>
                                    <Crosshair className="w-4 h-4" aria-hidden="true" /> {tracking ? 'Suivi actif' : 'Me suivre'}
                                </button>
                                <a href={mapsLink(selected.latitude, selected.longitude)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white border border-gray-300 text-ink text-sm font-semibold px-4 py-2.5">Google Maps</a>
                            </div>
                            {info && <p className="rounded-xl bg-sand px-3 py-2 text-sm font-semibold text-ink">{info}</p>}
                            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
                        </div>
                    ) : (
                        <div>
                            {loading && <p className="text-sm text-gray-400 text-center py-3">Chargement…</p>}
                            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
                            {!loading && !error && places.length === 0 && <p className="text-sm text-gray-600 text-center py-3">Les lieux du campus arrivent bientôt.</p>}
                            {!loading && places.length > 0 && visible.length === 0 && <p className="text-sm text-gray-600 text-center py-3">Aucun lieu ne correspond.</p>}
                            <ul className="divide-y divide-gray-200">
                                {visible.map((p) => (
                                    <li key={p.$id}>
                                        <button type="button" onClick={() => select(p)} className="w-full flex items-center gap-3 py-2.5 text-left">
                                            <span className="text-xl" aria-hidden="true">{KIND[p.kind]?.icon}</span>
                                            <span className="min-w-0"><span className="block text-sm font-semibold text-ink truncate">{p.name}</span><span className="block text-xs text-gray-500">{KIND[p.kind]?.name}</span></span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// src/features/caSert/components/LocationPicker.tsx — Vanessa
import { useEffect, useRef, useState } from 'react';
import maplibregl from '../lib/maplibreWorker';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geolocationService } from '@/services/geolocationService';
import { COUNTRY_MAP_CENTERS } from '../config/countryMapCenters';

interface Props {
    // Pays choisi dans le formulaire — la carte se recentre dessus à
    // chaque changement, pour ne plus rester bloquée sur Cotonou quand on
    // ajoute un lieu ailleurs (Togo, Sénégal...).
    country?: string;
    onChange: (lat: number, lng: number) => void;
}

const BENIN_CENTER: [number, number] = [2.42, 6.38];

export const LocationPicker = ({ country, onChange }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const [hasPosition, setHasPosition] = useState(false);
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState<string | null>(null);

    const placeMarker = (lng: number, lat: number) => {
        const map = mapRef.current;
        if (!map) return;
        if (markerRef.current) {
            markerRef.current.setLngLat([lng, lat]);
        } else {
            const el = document.createElement('div');
            el.style.width = '22px';
            el.style.height = '22px';
            el.style.borderRadius = '50% 50% 50% 0';
            el.style.transform = 'rotate(-45deg)';
            el.style.background = '#FF4757';
            el.style.border = '3px solid white';
            el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            markerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([lng, lat])
                .addTo(map);
        }
        setHasPosition(true);
        onChange(lat, lng);
    };

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const start = country ? COUNTRY_MAP_CENTERS[country] : undefined;
        const map = new maplibregl.Map({
            container: containerRef.current,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: start?.center || BENIN_CENTER,
            zoom: start?.zoom ?? 12,
            attributionControl: { compact: true },
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        map.on('click', (e: maplibregl.MapMouseEvent) => placeMarker(e.lngLat.lng, e.lngLat.lat));

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recentre la carte à chaque changement de pays — SEULEMENT si aucune
    // position n'a encore été posée manuellement, pour ne jamais faire
    // sauter la carte sous les pieds de quelqu'un qui a déjà pointé un
    // endroit précis.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || hasPosition || !country) return;
        const target = COUNTRY_MAP_CENTERS[country];
        if (target) map.flyTo({ center: target.center, zoom: target.zoom, duration: 1000 });
    }, [country, hasPosition]);

    const handleLocateMe = async () => {
        setLocating(true);
        setLocateError(null);
        try {
            const { lat, lng } = await geolocationService.getCurrentPosition();
            mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, duration: 1200 });
            placeMarker(lng, lat);
        } catch {
            setLocateError("Impossible de récupérer ta position — vérifie que la localisation est autorisée, ou pointe l'endroit toi-même sur la carte.");
        } finally {
            setLocating(false);
        }
    };

    return (
        <div>
            <div className="relative">
                <div
                    ref={containerRef}
                    className="w-full h-48 rounded-xl overflow-hidden border border-gray-200"
                />
                <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={locating}
                    className="absolute top-2 left-2 z-10 bg-white shadow-md rounded-full px-3 py-2 text-xs font-semibold text-[#FF4757] flex items-center gap-1.5 disabled:opacity-50"
                >
                    {locating ? '⏳ Localisation...' : '📍 Me localiser ici'}
                </button>
            </div>
            <p className={`text-xs mt-1.5 ${hasPosition ? 'text-green-600' : 'text-gray-400'}`}>
                {hasPosition
                    ? '✅ Position posée — tape ailleurs pour la déplacer.'
                    : "👆 Touche la carte à l'endroit exact du lieu, ou utilise \"Me localiser ici\" si tu y es déjà."}
            </p>
            {locateError && <p className="text-xs text-red-500 mt-1">{locateError}</p>}
        </div>
    );
};
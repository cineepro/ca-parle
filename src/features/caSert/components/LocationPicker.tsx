// src/features/caSert/components/LocationPicker.tsx — Ça Parle
import { useEffect, useRef, useState } from 'react';
import maplibregl from '../lib/maplibreWorker';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
    // Centre de départ — le Bénin par défaut, pour ne pas ouvrir sur un
    // point du monde sans rapport avec l'audience réelle de l'app.
    defaultCenter?: [number, number];
    onChange: (lat: number, lng: number) => void;
}

const BENIN_CENTER: [number, number] = [2.42, 6.38];

export const LocationPicker = ({ defaultCenter = BENIN_CENTER, onChange }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const [hasPosition, setHasPosition] = useState(false);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: defaultCenter,
            zoom: 12,
            attributionControl: { compact: true },
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        const placeMarker = (lng: number, lat: number) => {
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

        map.on('click', (e: maplibregl.MapMouseEvent) => placeMarker(e.lngLat.lng, e.lngLat.lat));

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <div
                ref={containerRef}
                className="w-full h-48 rounded-xl overflow-hidden border border-gray-200"
            />
            <p className={`text-xs mt-1.5 ${hasPosition ? 'text-green-600' : 'text-gray-400'}`}>
                {hasPosition ? '✅ Position posée — tape ailleurs pour la déplacer.' : '👆 Touche la carte à l\'endroit exact du lieu.'}
            </p>
        </div>
    );
};
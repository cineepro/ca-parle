// src/features/uac/lib/geo.ts — Vanessa
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371000;
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Au-delà de cette distance à vol d'oiseau, un trajet « à pied » n'a pas de sens : on calcule en voiture.
export const WALKING_MAX_M = 6000;

export const mapsLink = (lat: number, lng: number) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;

export function normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

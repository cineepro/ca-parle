// src/services/geolocationService.ts — Vanessa
//
// Sur Android, `navigator.geolocation` du navigateur ne déclenche pas
// fiablement la vraie demande de permission native — il faut passer par
// le plugin Capacitor dédié, qui gère correctement le dialogue système
// Android (exactement comme pushService.ts pour les notifications). Sur
// le web, on garde l'API navigateur classique, qui fonctionne déjà bien.
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface SimplePosition {
    lat: number;
    lng: number;
}

const isNative = () => Capacitor.isNativePlatform();

export const geolocationService = {
    // Déclenche explicitement la demande de permission — à appeler une
    // fois au démarrage de l'app (voir AppLayout.tsx), comme pour les
    // notifications push, plutôt que d'attendre que l'utilisateur tombe
    // sur la carte.
    async requestPermission(): Promise<boolean> {
        if (!isNative()) return true; // le web demande lui-même, au moment de l'usage
        try {
            const status = await Geolocation.requestPermissions();
            return status.location === 'granted' || status.coarseLocation === 'granted';
        } catch {
            return false;
        }
    },

    async getCurrentPosition(): Promise<SimplePosition> {
        if (isNative()) {
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
            return { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
                reject,
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    },

    // Renvoie une fonction d'arrêt, à appeler pour cesser le suivi —
    // même contrat que navigator.geolocation.clearWatch, unifié pour les
    // deux plateformes.
    async watchPosition(onUpdate: (pos: SimplePosition) => void, onError: () => void): Promise<() => void> {
        if (isNative()) {
            const watchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
                if (err || !pos) { onError(); return; }
                onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            });
            return () => { Geolocation.clearWatch({ id: watchId }); };
        }
        const id = navigator.geolocation.watchPosition(
            (p) => onUpdate({ lat: p.coords.latitude, lng: p.coords.longitude }),
            onError,
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(id);
    },
};
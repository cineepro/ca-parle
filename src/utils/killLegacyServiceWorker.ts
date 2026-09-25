// src/utils/killLegacyServiceWorker.ts — Vanessa
// Filet de sécurité supplémentaire côté client, en plus du kill switch
// public/sw.js : si jamais un Service Worker est encore actif au moment où
// notre JS s'exécute (donc que le kill switch n'a pas encore fini son
// cycle), on le désinstalle nous-mêmes et on vide les caches.
export async function killLegacyServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((r) => r.unregister()));
        } catch { /* silencieux */ }
    }

    if ('caches' in window) {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        } catch { /* silencieux */ }
    }
}

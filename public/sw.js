// public/sw.js — Ça Parle
// ⚠️ KILL SWITCH — pas un vrai Service Worker applicatif.
//
// Déployé à la même URL que l'ancien Service Worker de Kinema+ pour le
// remplacer et le désinstaller définitivement. Un navigateur qui a encore
// l'ancien SW actif va, à un moment (nouvelle visite, ou vérification
// périodique du navigateur), re-télécharger ce fichier ; comme son contenu
// a changé, le navigateur installe cette nouvelle version, qui :
//   1. Prend immédiatement le contrôle (skipWaiting)
//   2. Vide tous les caches existants (ceux de l'ancien Kinema+ inclus)
//   3. Se désinstalle elle-même
//   4. Force un rechargement des onglets ouverts pour qu'ils récupèrent la
//      vraie version fraîche de Ça Parle depuis le réseau
//
// Résultat : l'utilisateur n'a RIEN à faire manuellement, pas de vidage de
// cache, pas de rechargements multiples — un seul cycle suffit.
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            try {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map((name) => caches.delete(name)));
            } catch { /* silencieux */ }

            try {
                await self.registration.unregister();
            } catch { /* silencieux */ }

            try {
                const clientsList = await self.clients.matchAll({ type: 'window' });
                clientsList.forEach((client) => client.navigate(client.url));
            } catch { /* silencieux */ }
        })()
    );
});

// Ne rien intercepter pendant la courte fenêtre entre l'activation et le
// unregister — laisser toutes les requêtes passer normalement.
self.addEventListener('fetch', () => {});

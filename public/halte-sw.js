// public/halte-sw.js — HALTE
// Garde la page « Parler en sécurité » (et ce qu'il faut pour l'afficher) sur le téléphone, pour qu'elle
// s'ouvre même sans connexion après une première visite. Ne concerne QUE les adresses /halte (portée
// limitée à /halte à l'enregistrement) : le reste de l'application n'est pas touché.
// Les envois (réseau d'Appwrite) ne passent jamais par ici.
const CACHE = 'halte-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter((n) => n.startsWith('halte-') && n !== CACHE).map((n) => caches.delete(n)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Page : le réseau d'abord (toujours à jour), la copie gardée si le réseau est coupé.
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const fresh = await fetch(req);
                const cache = await caches.open(CACHE);
                cache.put('/halte', fresh.clone());
                return fresh;
            } catch {
                const cached = await caches.match('/halte');
                return cached || new Response('Pas de connexion. Si tu es en danger : appelle le 138 ou le 117.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
            }
        })());
        return;
    }

    // Fichiers de l'application (JS, CSS, polices, images) : la copie gardée d'abord, mise à jour en arrière-plan.
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/halte') || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE);
            const cached = await cache.match(req);
            const network = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
            return cached || (await network) || Response.error();
        })());
    }
});

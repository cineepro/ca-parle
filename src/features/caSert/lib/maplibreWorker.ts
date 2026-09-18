// src/features/caSert/lib/maplibreWorker.ts — Ça Parle
//
// ⚠️ Bug connu de MapLibre GL JS v6 avec Vite : le worker interne (chargé
// via `new URL('./maplibre-gl-worker.mjs', import.meta.url)`) n'est pas
// détecté par Vite comme un point d'entrée de worker — il est copié tel
// quel, sans ses dépendances internes, et en production, la requête vers
// ce fichier tombe dans la redirection générale du site (index.html),
// donnant exactement l'erreur "disallowed MIME type (text/html)".
//
// Le correctif : importer le worker avec `?worker&url`, qui force Vite à
// le traiter comme un vrai point d'entrée autonome (empaqueté avec toutes
// ses dépendances, dans un seul fichier), puis donner explicitement son
// URL réelle à MapLibre via setWorkerUrl — AVANT de créer la moindre carte.
//
// À importer une seule fois, en tout premier, dans chaque fichier qui crée
// une carte (LocationPicker.tsx, CaSertMapView.tsx).
import * as maplibregl from 'maplibre-gl';
// @ts-ignore — Vite comprend cette syntaxe `?worker&url`, TypeScript non.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

export default maplibregl;
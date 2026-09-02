// vite.config.ts — Ça Parle
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // Transparence pour les scanners de sécurité et pour toi-même en
        // cas de bug en prod : le code source lisible reste consultable
        // derrière le bundle minifié, plutôt que de ressembler à du code
        // délibérément offusqué.
        sourcemap: true,
    },
});

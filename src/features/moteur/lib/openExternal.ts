// src/features/moteur/lib/openExternal.ts — Zem
// Ouvre un site dans un nouvel onglet (web) ou dans le navigateur du téléphone (application Android).
// La plupart des sites interdisent d'être affichés DANS une autre page : on ne les « enferme » donc pas.
export function openExternal(url: string): void {
    try {
        const u = new URL(url);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
        window.open(u.toString(), '_blank', 'noopener,noreferrer');
    } catch {
        /* adresse invalide : on n'ouvre rien */
    }
}

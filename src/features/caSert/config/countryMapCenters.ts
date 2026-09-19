// src/features/caSert/config/countryMapCenters.ts — Ça Parle
// Centre approximatif (ville principale) de chaque pays couvert — sert à
// recentrer automatiquement la carte du sélecteur de position quand
// l'utilisateur change de pays dans le formulaire d'ajout, plutôt que de
// le laisser bloqué sur Cotonou par défaut.
export const COUNTRY_MAP_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
    benin: { center: [2.42, 6.37], zoom: 12 }, // Cotonou
    'cote-ivoire': { center: [-4.02, 5.32], zoom: 12 }, // Abidjan
    cameroun: { center: [9.70, 4.05], zoom: 12 }, // Douala
    togo: { center: [1.22, 6.13], zoom: 12 }, // Lomé
    senegal: { center: [-17.44, 14.69], zoom: 12 }, // Dakar
    autre: { center: [2.42, 6.37], zoom: 4 }, // pas de pays précis — vue large par défaut
};
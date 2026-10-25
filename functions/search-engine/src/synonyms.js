// functions/search-engine/src/synonyms.js — Zem
// Mots qui veulent dire « la même chose » pour les gens (sans accents, en minuscules). Chercher l'un
// trouve aussi les pages qui emploient l'autre (un peu moins fort que le mot exact).
// ⚠️ Liste de départ, volontairement courte : à enrichir avec les mots du quotidien béninois
// (y compris fon, yoruba…) en les faisant valider par des locaux.
const EQUIVALENTS = [
    ['bac', 'baccalaureat'],
    ['concours', 'recrutement'],
    ['emploi', 'travail', 'boulot'],
    ['inscription', 'preinscription'],
    ['fac', 'faculte', 'universite'],
    ['licence', 'lmd'],
    ['resultat', 'admis', 'admission'],
    ['impot', 'dgi'],
    ['cnss', 'securite sociale'],
    ['anip', 'identification'],
    ['cip', 'identite'],
    ['bourse', 'allocation'],
    ['stage', 'stagiaire'],
];

export const SYNONYMS = (() => {
    const map = {};
    for (const set of EQUIVALENTS) {
        for (const a of set) map[a] = [...new Set([...(map[a] || []), ...set.filter((b) => b !== a)])];
    }
    return map;
})();

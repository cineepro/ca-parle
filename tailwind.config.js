import defaultTheme from 'tailwindcss/defaultTheme';

// Identité "Pull moutarde" — tirée de l'image officielle de Vanessa.
//
//   moutarde  le jaune de son pull    → boutons principaux (texte FONCÉ dessus)
//   ocre      moutarde assombri       → liens, textes actifs, icônes d'accent
//   brun      sa peau                 → boutons secondaires
//   encre     ses cheveux             → texte, titres, contour de focus
//   crème     fond de l'app
//
// ⚠️ Règle d'or : le jaune ne porte JAMAIS de texte blanc (contraste 1,7:1).
// Sur fond `brand`, le texte est toujours `text-ink` (10:1).
// En texte sur fond clair, on utilise `text-ochre` (5,2:1 sur crème).
//
// Les échelles gray / red / green / amber de Tailwind sont REMPLACÉES par des
// versions chaudes et plus foncées : tous les usages existants (`text-gray-400`,
// `bg-gray-50`, `text-red-500`...) deviennent cohérents et lisibles d'un coup,
// sans modifier chaque fichier.
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#F5C032', // moutarde — fond des boutons principaux
                    hover: '#E2A216', //   moutarde foncé — survol
                    tint: '#FFF1C7', //    fond léger (état actif, pastilles)
                    strong: '#FFE08A', //  fond léger plus marqué
                },
                ochre: '#964F08', //  texte/icônes d'accent sur fond clair
                brun: '#865037', //   boutons secondaires
                ink: '#221B17', //    texte principal
                cream: '#FBF6EE', //  fond de l'app
                sand: '#F4ECDD', //   bulles, pastilles neutres

                // Neutres chauds (remplacent le gris bleuté de Tailwind).
                gray: {
                    50: '#FBF6EE',
                    100: '#F4ECDD',
                    200: '#EADFCF',
                    300: '#D9CBB6',
                    400: '#72655A', // texte discret : ≥ 4,5:1 sur blanc, crème et sable
                    500: '#65574C',
                    600: '#5E5148',
                    700: '#4A3F38',
                    800: '#2E2520',
                    900: '#221B17',
                },
                red: {
                    50: '#FCE8E6',
                    100: '#F9D3CF',
                    200: '#F2ADA6',
                    300: '#E8837A',
                    400: '#D4574C',
                    500: '#BF3A2E',
                    600: '#B3261E',
                    700: '#8E1B15',
                    800: '#6E1510',
                    900: '#4D0F0B',
                },
                green: {
                    50: '#E3F3EC',
                    100: '#C7E6D8',
                    200: '#9DD1BA',
                    300: '#6BB89A',
                    400: '#3F9C7B',
                    500: '#2A8A68',
                    600: '#1F7A5C',
                    700: '#17604A',
                    800: '#124A39',
                    900: '#0D3628',
                },
                amber: {
                    50: '#FFF8E1',
                    100: '#FFF1C7',
                    200: '#FFE08A',
                    300: '#F5C032',
                    400: '#E2A216',
                    500: '#B8680F',
                    600: '#964F08',
                    700: '#7F4407',
                    800: '#5F3305',
                    900: '#3F2203',
                },
            },
            fontFamily: {
                // Texte courant, messages, formulaires.
                sans: ['"Figtree Variable"', ...defaultTheme.fontFamily.sans],
                // Titres, boutons, chiffres.
                display: ['"Bricolage Grotesque Variable"', ...defaultTheme.fontFamily.sans],
            },
            borderRadius: {
                xl: '14px', //  champs, bulles
                '2xl': '22px', // cartes, fenêtres
                '3xl': '28px', // grandes cartes (connexion)
            },
            boxShadow: {
                // Ombres douces teintées de brun, pas de gris froid.
                sm: '0 1px 2px rgba(94, 62, 20, 0.07)',
                DEFAULT: '0 2px 8px rgba(94, 62, 20, 0.08)',
                md: '0 6px 18px rgba(94, 62, 20, 0.10)',
                lg: '0 10px 30px rgba(94, 62, 20, 0.13)',
                xl: '0 18px 44px rgba(94, 62, 20, 0.16)',
            },
        },
    },
    plugins: [],
};

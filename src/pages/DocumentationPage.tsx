// src/pages/DocumentationPage.tsx — Ça Parle
import { Link } from 'react-router-dom';

interface Section {
    title: string;
    content: string;
}

interface Group {
    heading: string;
    sections: Section[];
}

const GROUPS: Group[] = [
    {
        heading: '🔥 Les histoires',
        sections: [
            {
                title: '📝 Publier',
                content:
                    "Chaque publication est une \"histoire\" avec un type (Ragot, Révélation, Témoignage, Rumeur) et un statut qui évolue dans le temps : 🔴 Rumeur → 🟠 En vérification → 🟢 Confirmé ou ⚫ Démenti. L'auteur peut ajouter des mises à jour à sa propre histoire au fil du temps, visibles dans la section \"Ce que Ça Parle sait\".",
            },
            {
                title: '🕵️ L\'anonymat',
                content:
                    "Tu peux publier une histoire ou un commentaire en anonyme : ton nom n'est alors affiché à personne d'autre. La plateforme garde une trace technique de l'auteur pour les besoins de modération en cas de signalement.",
            },
            {
                title: '🔥😂😲 / 💯🤔❌ Réagir',
                content:
                    "Sur chaque histoire, tu peux poser une réaction rapide (🔥😂😲) ou voter si tu y crois (💯 Vrai / 🤔 Possible / ❌ Faux). Une seule réaction active à la fois par histoire.",
            },
            {
                title: '🔮 Prédictions',
                content:
                    "L'auteur d'une histoire peut lancer une prédiction (\"Que va-t-il se passer ensuite ?\"). Tout le monde vote une fois. Quand l'auteur résout la prédiction, ta fiabilité et ton indice de réputation évoluent selon que tu avais vu juste ou non.",
            },
            {
                title: '⭐ Réputation et badges',
                content:
                    'Publier, commenter et bien prédire fait monter ton niveau de commérage, ton score de réputation et ton indice de fiabilité, visibles sur ton profil. Des badges se débloquent automatiquement selon ton activité.',
            },
            {
                title: '🔎 Fiches références',
                content:
                    "Chaque histoire peut être rattachée à une ou plusieurs fiches (personnes, événements, sujets). Chaque fiche regroupe toutes les histoires qui la concernent — c'est la mémoire collective de la plateforme.",
            },
            {
                title: '🚩 Signaler un contenu',
                content:
                    "Si un contenu te semble problématique (diffamation, harcèlement, données privées, etc.), utilise le bouton \"Signaler\". Notre équipe de modération l'examine et peut le masquer, le supprimer ou sanctionner son auteur.",
            },
            {
                title: '💬 Messagerie',
                content:
                    "Tu peux démarrer une conversation privée avec l'auteur d'une histoire (si elle n'est pas anonyme), ou rechercher directement une personne depuis l'onglet Messages.",
            },
        ],
    },
    {
        heading: '🔮 Vanessa',
        sections: [
            {
                title: '🗣️ Qui est Vanessa ?',
                content:
                    "Vanessa est l'IA de Ça Parle — une personnalité au langage de rue, pas un assistant classique. Discute avec elle en texte ou en vocal, envoie-lui une photo, elle réagit avec humour tout en restant sérieuse sur les sujets sensibles.",
            },
            {
                title: '😊 Ses humeurs',
                content:
                    "Vanessa a plusieurs humeurs selon le ton de la conversation (curieuse, taquine, complice...). Elle s'adapte naturellement, pas besoin de lui demander de changer.",
            },
            {
                title: '🧠 Sa mémoire',
                content:
                    "Vanessa retient certains éléments d'une conversation à l'autre pour des échanges plus naturels. Tu peux consulter et effacer ce qu'elle a retenu de toi à tout moment depuis ton profil, section \"Ce que Vanessa se souvient\".",
            },
            {
                title: '🔗 Les connecteurs',
                content:
                    "Certaines conversations avec Vanessa peuvent être liées à un partenaire (association, média...) — une pastille apparaît alors en haut du chat. Vanessa garde son ton habituel, mais reste factuellement rigoureuse sur le sujet du partenaire actif.",
            },
            {
                title: '⏳ Limite quotidienne',
                content:
                    "Pour que Vanessa reste disponible pour tout le monde, il y a une limite raisonnable d'échanges par jour et par personne. Si tu l'atteins, elle te le dit elle-même et te donne rendez-vous le lendemain.",
            },
        ],
    },
    {
        heading: '🧰 Ça sert',
        sections: [
            {
                title: '🗺️ La carte des bons plans',
                content:
                    "Ça sert regroupe les bons plans locaux (lieux, services) et les prix du moment, partagés par la communauté. Ouvre-la depuis le menu principal — elle s'affiche par défaut sous forme de carte interactive, avec un mode liste disponible en bascule.",
            },
            {
                title: '➕ Ajouter un bon plan',
                content:
                    "Depuis \"Balance ton bon plan\", choisis entre un lieu/service ou un prix. Pour un lieu, indique sa position exacte sur la petite carte (ou utilise \"Me localiser ici\" si tu y es déjà) — c'est ce qui permet à tout le monde de le retrouver précisément ensuite.",
            },
            {
                title: '✅ Validation',
                content:
                    "Chaque nouveau bon plan passe d'abord par une vérification avant d'apparaître publiquement — ça évite les doublons et les informations fausses. Suis l'avancement de tes propres publications dans \"Mes contributions\".",
            },
            {
                title: '🙋 Confirmer un bon plan',
                content:
                    "Sur chaque fiche, un bouton \"Confirmé\" permet à la communauté de valider qu'un bon plan est toujours d'actualité — plus il y a de confirmations, plus il est fiable.",
            },
            {
                title: '🧭 Itinéraire',
                content:
                    "En cliquant un lieu sur la carte, tu peux demander un itinéraire routier depuis ta position réelle jusqu'à ce lieu, avec distance et durée — nécessite d'autoriser la localisation.",
            },
        ],
    },
    {
        heading: '🔔 Autres fonctionnalités',
        sections: [
            {
                title: '🔔 Notifications',
                content:
                    "Tu es notifié en temps réel des réactions, commentaires, messages et relances de Vanessa sur tes conversations — configurable dans les paramètres de ton téléphone/navigateur.",
            },
            {
                title: '📧 Newsletter',
                content:
                    "Un résumé occasionnel de l'actualité de la plateforme, envoyé par email. Tu peux t'en désinscrire à tout moment via le lien présent dans chaque envoi.",
            },
        ],
    },
];

export default function DocumentationPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>

                <div className="bg-white rounded-3xl p-6 space-y-2">
                    <h1 className="text-xl font-bold text-gray-800">📖 Comment fonctionne Ça Parle</h1>
                    <p className="text-sm text-gray-400">« Ça parle de quoi aujourd'hui ? »</p>
                </div>

                {GROUPS.map((group) => (
                    <div key={group.heading} className="bg-white rounded-3xl p-6 space-y-5">
                        <h2 className="text-base font-bold text-gray-800">{group.heading}</h2>
                        {group.sections.map((section) => (
                            <div key={section.title} className="space-y-1.5">
                                <h3 className="font-bold text-gray-800 text-sm">{section.title}</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
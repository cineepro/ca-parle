// src/pages/DocumentationPage.tsx — Ça Parle
import { Link } from 'react-router-dom';

const SECTIONS = [
    {
        title: '🔥 Les histoires',
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
];

export default function DocumentationPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>

                <div className="bg-white rounded-3xl p-6 space-y-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">📖 Comment fonctionne Ça Parle</h1>
                        <p className="text-sm text-gray-400 mt-1">« Ça parle de quoi aujourd'hui ? »</p>
                    </div>

                    {SECTIONS.map((section) => (
                        <div key={section.title} className="space-y-1.5">
                            <h2 className="font-bold text-gray-800 text-sm">{section.title}</h2>
                            <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

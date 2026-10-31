// src/pages/DocumentationPage.tsx — Vanessa
// « Comment ça marche » : ce que fait l'application, dans l'ordre où on la découvre.
import { Link } from 'react-router-dom';

interface Section {
    title: string;
    content: string;
}

interface Group {
    heading: string;
    intro?: string;
    sections: Section[];
}

const GROUPS: Group[] = [
    {
        heading: 'Vanessa, l\'IA des Béninois',
        intro: "Vanessa est une intelligence artificielle. Elle est là pour t'aider sur le Bénin : pose-lui tes questions sur le pays, ses démarches, ses lieux, sa vie de tous les jours. Le gbaraï (les ragots) n'est qu'une facette de ce qu'elle sait faire.",
        sections: [
            {
                title: 'Lui parler',
                content:
                    "Écris-lui, parle-lui en vocal ou envoie-lui une photo. Elle répond avec son ton à elle, mais reste sérieuse sur les sujets sensibles. Ce n'est pas une personne : c'est une IA, qui peut se tromper.",
            },
            {
                title: 'D\'où viennent ses réponses',
                content:
                    "Sur le Bénin, Vanessa s'appuie sur des notes écrites et validées par l'équipe, et sur les notes de ses partenaires (université, associations, médias...). Quand elle ne trouve pas l'information, elle le dit au lieu d'inventer, et peut te conseiller de vérifier auprès de la structure concernée. Elle ne doit jamais inventer un chiffre, une date, un prix, une adresse ou une démarche.",
            },
            {
                title: 'Les partenaires, sans rien choisir',
                content:
                    "Il n'y a plus de pastille à activer. Quand ta question concerne un partenaire (l'UAC par exemple), Vanessa le comprend toute seule et utilise ses informations. Quand deux partenaires sont concernés, elle peut utiliser les deux. Si aucun ne correspond, elle cherche dans les connaissances générales sur le Bénin.",
            },
            {
                title: 'Contenu sponsorisé',
                content:
                    "Un partenaire peut demander que Vanessa mentionne une information le concernant. Cette mention est toujours placée à la fin de la réponse et commence par « PUB : », pour que tu la reconnaisses : ce n'est jamais une opinion spontanée de Vanessa.",
            },
            {
                title: 'Mon cahier',
                content:
                    "« Mon cahier » est ton espace de notes personnelles (menu → Mon cahier). Vanessa ne s'en sert que si tu le lui demandes clairement, par exemple en parlant de ton cahier ou de tes notes. Ces notes sont personnelles : elles ne sont montrées à aucun autre utilisateur.",
            },
            {
                title: 'Sa mémoire',
                content:
                    "Vanessa retient certains éléments d'une conversation à l'autre pour des échanges plus naturels. Tu peux consulter et effacer ce qu'elle a retenu de toi à tout moment depuis ton profil, section « Ce que Vanessa se souvient ».",
            },
            {
                title: 'Zem',
                content:
                    "Vanessa sait que Zem existe. Quand c'est utile, elle te propose d'y chercher une information sur un site béninois. Elle ne présente jamais le contenu de Zem comme le sien.",
            },
            {
                title: 'Limite quotidienne et relances',
                content:
                    "Pour que Vanessa reste disponible pour tout le monde, il y a une limite d'échanges par jour et par personne. Si tu l'atteins, elle te le dit et te donne rendez-vous le lendemain. Elle peut aussi te relancer par notification ; tu peux les couper dans les réglages de ton téléphone ou de ton navigateur.",
            },
        ],
    },
    {
        heading: 'Ça parle — les ragots',
        intro: "L'écran « Ça parle » a deux onglets, qu'on parcourt en glissant de gauche à droite : Ragots et UAC.",
        sections: [
            {
                title: 'Publier',
                content:
                    "Chaque publication est une « histoire » avec un type (Ragot, Révélation, Témoignage, Rumeur) et un statut qui évolue dans le temps : 🔴 Rumeur → 🟠 En vérification → 🟢 Confirmé ou ⚫ Démenti. L'auteur peut ajouter des mises à jour à sa propre histoire.",
            },
            {
                title: 'L\'anonymat',
                content:
                    "Tu peux publier une histoire ou un commentaire en anonyme : ton nom n'est alors affiché à personne d'autre. La plateforme garde une trace technique de l'auteur pour la modération et pour répondre à une obligation légale. L'anonymat protège ton nom face aux autres utilisateurs, pas face à la justice.",
            },
            {
                title: 'Réagir et voter',
                content:
                    "Sur chaque histoire, tu peux poser une réaction rapide (🔥😂😲) ou voter si tu y crois (💯 Vrai / 🤔 Possible / ❌ Faux). Une seule réaction active à la fois par histoire.",
            },
            {
                title: 'Prédictions',
                content:
                    "L'auteur d'une histoire peut lancer une prédiction (« Que va-t-il se passer ensuite ? »). Tout le monde vote une fois. Quand l'auteur la résout, ta fiabilité évolue selon que tu avais vu juste ou non.",
            },
            {
                title: 'Réputation et badges',
                content:
                    "Publier, commenter et bien prédire fait monter ton niveau, ton score de réputation et ton indice de fiabilité, visibles sur ton profil. Des badges se débloquent selon ton activité. L'équipe peut aussi attribuer un badge « certifié » à un compte.",
            },
            {
                title: 'Fiches références',
                content:
                    "Chaque histoire peut être rattachée à des fiches (personnes, événements, sujets) qui regroupent toutes les histoires concernées.",
            },
            {
                title: 'Signaler un contenu',
                content:
                    "Si un contenu te semble problématique (diffamation, harcèlement, données privées...), utilise « Signaler ». L'équipe l'examine et peut le masquer, le supprimer ou sanctionner son auteur.",
            },
            {
                title: 'Messagerie',
                content:
                    "Tu peux démarrer une conversation privée avec l'auteur d'une histoire (si elle n'est pas anonyme), ou chercher une personne depuis l'onglet Messages.",
            },
        ],
    },
    {
        heading: 'Ça parle — l\'espace UAC',
        intro: "Pour les étudiants de l'Université d'Abomey-Calavi : tout ce qui sert sur le campus, au même endroit. L'onglet est ouvert à tous les utilisateurs.",
        sections: [
            {
                title: 'Au menu aujourd\'hui',
                content:
                    "En haut de l'onglet, une carte par restaurant universitaire montre le petit-déjeuner, le déjeuner et le dîner du jour, avec le repas du moment mis en avant. Le menu est prévu à la semaine et se répète chaque semaine : c'est celui du jour d'aujourd'hui qui s'affiche (heure du Bénin). Il peut changer exceptionnellement, vérifie sur place.",
            },
            {
                title: 'Les actualités',
                content:
                    "Concours, locations, emplois, soutenances, excursions : n'importe quel utilisateur peut publier une actualité, avec une date, un contact et une photo si besoin, et la retrouver par catégorie. Ton nom est affiché sur ce que tu publies, et tu peux le supprimer quand tu veux. Il y a une limite de 5 publications par jour et par personne.",
            },
            {
                title: 'Prudence avec les annonces',
                content:
                    "Une annonce est publiée par un étudiant, pas vérifiée à l'avance par l'équipe. Pour une location ou un emploi, ne paie jamais avant d'avoir vu le lieu ou rencontré la personne. Signale toute annonce suspecte : elle sera retirée et son auteur peut être bloqué.",
            },
            {
                title: 'La carte du campus',
                content:
                    "Le bouton « Carte du campus » regroupe les amphis, l'administration, les banques, les commerces, la restauration, la santé, les bibliothèques et plus encore. Cherche un lieu, filtre par type, touche-le, puis « Y aller » : l'application trace le chemin à pied depuis ta position (en voiture si tu es à plus de 6 km), avec distance et durée. « Me suivre » affiche ta position en direct. Tout cela demande d'autoriser la localisation, et seulement au moment où tu le demandes. Un lieu peut être mal placé ou manquant : dis-le-nous.",
            },
        ],
    },
    {
        heading: 'Zem — chercher sur le Bénin',
        sections: [
            {
                title: 'Ce que fait Zem',
                content:
                    "Zem est le moteur de recherche de Vanessa pour le Bénin. Il ne cherche pas sur tout internet : il cherche dans une sélection de sites béninois choisis par l'équipe et dans des fiches écrites à la main. Il peut aussi chercher dans les connaissances de Vanessa sur le Bénin et dans celles de ses partenaires, quand l'équipe les y a ajoutées.",
            },
            {
                title: 'Des extraits, toujours avec la source',
                content:
                    "Zem montre un extrait et renvoie vers le site d'origine. La « réponse rapide » recopie des phrases des pages trouvées, sans rien inventer, et cite ses sources. Les pages lues récemment restent sur ton appareil pour être relues sans connexion.",
            },
            {
                title: 'Une erreur ?',
                content:
                    "Touche « Signaler un problème » sur un résultat faux, dépassé ou inapproprié : l'équipe le vérifie. La page « Comment Zem fonctionne » (en bas de Zem) détaille d'où viennent les résultats.",
            },
        ],
    },
    {
        heading: 'Ça sert',
        sections: [
            {
                title: 'Les bons plans et les prix',
                content:
                    "Ça sert regroupe les bons plans locaux (lieux, services) et les prix du moment, partagés par la communauté, sur une carte interactive ou en liste.",
            },
            {
                title: 'Ajouter un bon plan',
                content:
                    "Depuis « Balance ton bon plan », choisis un lieu/service ou un prix. Pour un lieu, indique sa position exacte sur la petite carte (ou « Me localiser ici » si tu y es). Chaque contribution est vérifiée avant d'apparaître ; suis-la dans « Mes contributions ».",
            },
            {
                title: 'Confirmer et s\'orienter',
                content:
                    "Le bouton « Confirmé » permet à la communauté de valider qu'un bon plan est toujours d'actualité. En touchant un lieu, tu peux demander un itinéraire depuis ta position, avec distance et durée.",
            },
        ],
    },
    {
        heading: 'HALTE — demander de l\'aide',
        intro: "HALTE est un moyen simple de demander de l'aide en cas de violence, sans compte et en moins d'une minute, avec une équipe d'écoute qui rappelle. Il est lancé avec U-Report by UNICEF Sèmè-Podji ; tant qu'il n'est pas ouvert dans ta zone, la page HALTE l'indique et rappelle les numéros d'urgence.",
        sections: [
            {
                title: 'Comment demander de l\'aide',
                content:
                    "En scannant le QR code d'une affiche, tu peux écrire un court message, ou, si tu préfères ne pas écrire, enregistrer un message vocal de 2 minutes au plus. Si tu n'as pas internet, l'affiche te permet d'envoyer un SMS ou d'appeler. En cas de danger immédiat, appelle d'abord les services d'urgence : un formulaire ne remplace jamais un appel.",
            },
            {
                title: 'Qui lit ton message',
                content:
                    "Seules les personnes de la cellule d'écoute, formées pour cela. Chaque consultation est enregistrée. Aucune alerte n'est transmise à une autorité sans que la cellule ait pris contact avec toi et évalué la situation. Tu n'as pas à donner ton nom.",
            },
        ],
    },
    {
        heading: 'Ton compte',
        sections: [
            {
                title: 'Photo et profil',
                content:
                    "Tu peux ajouter une photo de profil, visible par les autres utilisateurs, et la retirer quand tu veux.",
            },
            {
                title: 'Proposer une idée',
                content:
                    "Tu peux envoyer une proposition pour améliorer Vanessa. L'équipe la lit ; Vanessa, elle, ne la lit jamais.",
            },
            {
                title: 'Agents et partenaires',
                content:
                    "Un agent de la campagne #construisonsVanessa peut déclarer t'avoir inscrit : il voit alors les informations de ton compte (voir la politique de confidentialité). Un partenaire voit seulement l'usage de son connecteur (nombre d'échanges), jamais le contenu de tes conversations.",
            },
            {
                title: 'Notifications et newsletter',
                content:
                    "Tu es notifié des réactions, commentaires, messages et relances de Vanessa, réglables dans ton téléphone ou ton navigateur. La newsletter est un résumé occasionnel par e-mail, dont tu peux te désinscrire à tout moment avec le lien de chaque envoi.",
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
                    <h1 className="text-xl font-bold text-gray-800">Comment ça marche</h1>
                    <p className="text-sm text-gray-400">Vanessa, l'IA des Béninois — « Celle qui vous ressemble et vous rassemble »</p>
                    <p className="text-xs text-gray-400">Mis à jour le 31 octobre 2026</p>
                </div>

                {GROUPS.map((group) => (
                    <div key={group.heading} className="bg-white rounded-3xl p-6 space-y-5">
                        <div className="space-y-1.5">
                            <h2 className="text-base font-bold text-gray-800">{group.heading}</h2>
                            {group.intro && <p className="text-sm text-gray-600 leading-relaxed">{group.intro}</p>}
                        </div>
                        {group.sections.map((section) => (
                            <div key={section.title} className="space-y-1.5">
                                <h3 className="font-bold text-gray-800 text-sm">{section.title}</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
                            </div>
                        ))}
                    </div>
                ))}

                <p className="text-center text-xs text-gray-400">
                    <Link to="/privacy" className="underline">Confidentialité</Link> · <Link to="/terms" className="underline">Conditions d'utilisation</Link>
                </p>
            </div>
        </div>
    );
}

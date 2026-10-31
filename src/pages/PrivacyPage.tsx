// src/pages/PrivacyPage.tsx — Vanessa
import { Link } from 'react-router-dom';

const CONTACT = 'seriquicinee@gmail.com';

interface Block {
    title: string;
    paragraphs?: string[];
    items?: string[];
    // Deuxième liste (avec son intitulé), pour ne pas couper une section en deux.
    label2?: string;
    items2?: string[];
}

const BLOCKS: Block[] = [
    {
        title: '1. Qui sommes-nous',
        paragraphs: [
            'La présente politique décrit comment ASILLIA (« nous »), éditeur de la plateforme Vanessa, collecte, utilise et protège les données personnelles des utilisateurs (« toi », « tu »). Elle couvre l\'ensemble de l\'application : Vanessa, Ça parle (ragots et espace UAC), Ça sert, Zem et HALTE.',
        ],
    },
    {
        title: '2. Données que nous collectons',
        paragraphs: ['Données que tu nous donnes :'],
        items: [
            'Nom, adresse e-mail, mot de passe (stocké de façon chiffrée, jamais en clair).',
            'Numéro de téléphone : facultatif, uniquement si tu choisis de le renseigner.',
            'Photo de profil : facultative, visible par les autres utilisateurs, que tu peux retirer à tout moment.',
            'Ce que tu publies : histoires, commentaires, réactions, votes, prédictions, messages privés (texte et vocaux).',
            'Tes échanges avec Vanessa : messages, messages vocaux (transcrits en texte), photos que tu lui envoies.',
            'Tes notes personnelles dans « Mon cahier » et tes propositions d\'amélioration.',
            'Les actualités que tu publies dans l\'espace UAC : texte, date, contact que tu choisis d\'écrire (téléphone, par exemple) et photo éventuelle. Ces informations, ainsi que ton nom, sont visibles par les autres utilisateurs connectés.',
            'Ta position géographique : uniquement quand tu le demandes (voir l\'article 6). Jamais en arrière-plan.',
        ],
        label2: 'Données collectées automatiquement :',
        items2: [
            'Adresse IP, type d\'appareil et de navigateur.',
            'Journaux techniques de connexion (dates, heures, pages consultées) pour la sécurité et la lutte contre les abus.',
            'Des compteurs d\'usage (nombre d\'échanges avec Vanessa par jour, par exemple) pour que le service reste disponible pour tout le monde.',
        ],
    },
    {
        title: '3. Pourquoi nous utilisons ces données',
        items: [
            'Fournir et sécuriser le service (connexion, affichage des contenus, messagerie, réponses de Vanessa, recherche).',
            'Assurer la modération et lutter contre les abus et les annonces trompeuses.',
            'Te contacter pour des besoins opérationnels : vérification d\'e-mail, notifications, relances de Vanessa, newsletter si tu y as consenti.',
            'Améliorer le service, à partir de statistiques qui ne te nomment pas.',
        ],
    },
    {
        title: '4. L\'intelligence artificielle (Vanessa)',
        paragraphs: [
            'Vanessa est une intelligence artificielle. Elle repose sur des modèles exploités par des prestataires tiers : Anthropic pour comprendre et rédiger les textes et lire les photos, ElevenLabs pour la voix. Pour te répondre, nous leur transmettons ce qui est strictement nécessaire : ton message, le début de la conversation, les informations utiles trouvées dans nos notes, et ce que Vanessa a retenu de toi. Une première étape très courte, qui décide quelles connaissances consulter, reçoit elle aussi ta question. Ces prestataires traitent ces données selon leurs propres politiques et engagements contractuels.',
            'Le contenu d\'une conversation privée avec Vanessa n\'est jamais réutilisé pour répondre à un autre utilisateur ni pour alimenter une publication, sauf action volontaire et explicite de ta part.',
            'Vanessa retient certains éléments d\'une conversation à l\'autre (sa « mémoire »). Tu peux à tout moment les consulter et les effacer depuis ton profil.',
            '« Mon cahier » est personnel : Vanessa ne le consulte que lorsque tu le lui demandes clairement, et ses notes ne sont montrées à aucun autre utilisateur.',
        ],
    },
    {
        title: '5. Les partenaires de Vanessa',
        paragraphs: [
            'Vanessa peut s\'appuyer sur des informations fournies par des partenaires (université, associations, médias...). Un partenaire n\'a pas accès au contenu de tes conversations : il voit seulement l\'usage de son connecteur (par exemple le nombre d\'échanges qui l\'ont concerné), sans qu\'on te nomme.',
            'Un partenaire peut demander à Vanessa de mentionner une information le concernant. Cette mention est toujours précédée de « PUB : » pour être reconnaissable.',
        ],
    },
    {
        title: '6. Position géographique et cartes',
        paragraphs: [
            'Ta position n\'est utilisée que lorsque tu appuies sur un bouton qui la demande : poser un bon plan sur la carte « Ça sert », « Me localiser ici », « Y aller » ou « Me suivre » sur la carte du campus de l\'UAC. Tu peux refuser l\'autorisation dans ton téléphone ou ton navigateur.',
            'Pour calculer un itinéraire, ta position de départ et la destination sont envoyées à notre serveur, qui les transmet au service d\'itinéraires OpenRouteService (basé sur OpenStreetMap). Nous ne les enregistrons pas. Le suivi en direct reste sur ton appareil.',
            'Les fonds de carte sont fournis par OpenFreeMap : pour les afficher, ton appareil contacte leur serveur, qui voit donc ton adresse IP comme n\'importe quel site.',
            'La position d\'un lieu que tu ajoutes à « Ça sert » est celle du lieu, et elle devient visible une fois la contribution validée.',
        ],
    },
    {
        title: '7. Zem',
        items: [
            'Zem cherche dans des pages publiques de sites béninois lues par un robot, dans des fiches de l\'équipe et dans des notes de Vanessa que l\'équipe a choisi d\'y ajouter. Ces notes sont lisibles par tous les utilisateurs connectés. Les notes de « Mon cahier » n\'y sont jamais.',
            'Tes recherches sont enregistrées sans ton nom ni ton identifiant, seulement pour voir ce qui manque. Le nombre d\'ouvertures d\'une page est compté pour la page, pas pour toi.',
            'Un signalement sur un résultat (« faux », « dépassé »...) est transmis à l\'équipe sans ton identité.',
            'Les pages que tu lis restent sur ton appareil pour être relues sans connexion, et nulle part ailleurs.',
        ],
    },
    {
        title: '8. HALTE (demander de l\'aide)',
        paragraphs: [
            'HALTE ne demande pas de compte. Selon ce que tu choisis d\'envoyer, nous recevons : pour qui est la demande, si le danger est immédiat, le lieu (ou le code du QR scanné), un numéro de téléphone si tu veux être rappelé, le meilleur moment pour le faire, ton message écrit et, si tu le décides, un message vocal de 2 minutes au plus. Si tu passes par SMS, ton numéro et ton texte nous parviennent par la passerelle SMS.',
            'Seule la cellule d\'écoute, formée pour cela, peut lire ces informations ; chaque consultation est enregistrée. Les notifications envoyées à la cellule ne contiennent jamais ton message. Les messages vocaux sont rangés dans un espace privé.',
            'Pour repérer les envois en rafale, nous gardons une empreinte technique irréversible calculée à partir de ton adresse IP et de ton navigateur, jamais l\'adresse elle-même. Elle ne sert jamais à écarter une personne qui demande de l\'aide.',
            'Aucune alerte n\'est transmise à une autorité sans que la cellule ait pris contact avec toi et évalué la situation, sauf obligation légale. Les alertes closes sont supprimées après un délai fixé avec nos partenaires.',
        ],
    },
    {
        title: '9. Agents commerciaux (#construisonsVanessa)',
        paragraphs: [
            'Un agent de la campagne peut déclarer t\'avoir inscrit en saisissant ton adresse e-mail. Il voit alors, pour les personnes qu\'il a inscrites : ton nom, ton e-mail, ton numéro de téléphone, la date d\'inscription, si tu as une photo, le nombre de tes histoires et de tes commentaires, et les propositions que tu as envoyées. Il ne voit ni tes conversations avec Vanessa, ni tes messages privés. Si tu ne veux pas être rattaché à un agent, écris-nous.',
        ],
    },
    {
        title: '10. Publication anonyme',
        paragraphs: [
            'Lorsque tu publies en anonyme, ton identité n\'est pas affichée aux autres utilisateurs. Elle reste associée techniquement à ton compte dans nos systèmes, notamment pour la modération et pour répondre à une obligation légale.',
        ],
    },
    {
        title: '11. Partage des données',
        paragraphs: ['Tes données ne sont jamais vendues. Elles peuvent être partagées avec :'],
        items: [
            'Nos prestataires techniques (hébergement, authentification, envoi d\'e-mails et de SMS, intelligence artificielle, cartes et itinéraires), dans la stricte mesure nécessaire au service.',
            'Les autorités compétentes, en cas d\'obligation légale ou de réquisition judiciaire.',
        ],
    },
    {
        title: '12. Transferts internationaux',
        paragraphs: [
            'Certains prestataires sont situés hors de ton pays, notamment aux États-Unis ou en Europe. Ces transferts sont encadrés par les garanties contractuelles que ces prestataires proposent.',
        ],
    },
    {
        title: '13. Durée de conservation',
        paragraphs: [
            'Tes données sont conservées tant que ton compte est actif. Si tu supprimes ton compte, tes données d\'identification sont supprimées ou anonymisées dans un délai raisonnable, sous réserve des obligations légales de conservation (journaux de sécurité, par exemple). Les actualités UAC et les contributions que tu as publiées peuvent être supprimées par toi ou par la modération. Les alertes HALTE closes sont supprimées après le délai indiqué à l\'article 8.',
        ],
    },
    {
        title: '14. Tes droits',
        paragraphs: [
            `Sous réserve de la réglementation qui t'est applicable, tu disposes d'un droit d'accès, de rectification, d'effacement et d'opposition sur tes données personnelles. Pour les exercer, écris-nous à ${CONTACT}. Nous nous efforçons de répondre dans un délai raisonnable.`,
        ],
    },
    {
        title: '15. Sécurité',
        paragraphs: [
            'Nous mettons en œuvre des mesures techniques raisonnables pour protéger tes données : chiffrement des communications (HTTPS), mots de passe hachés, accès restreints à nos systèmes, espaces privés pour les messages vocaux de HALTE. Aucun système n\'étant infaillible, nous ne pouvons pas garantir une sécurité absolue.',
        ],
    },
    {
        title: '16. Cookies et stockage local',
        paragraphs: [
            'L\'application utilise le stockage local de ton navigateur ou de ton appareil pour garder ta session, mémoriser certaines préférences et conserver des copies de pages pour la lecture sans connexion (Zem, HALTE). Nous n\'utilisons aucun cookie publicitaire ni de suivi par des tiers à des fins commerciales.',
        ],
    },
    {
        title: '17. Mineurs',
        paragraphs: [
            'L\'inscription est réservée aux personnes majeures, comme l\'indiquent nos Conditions d\'utilisation. Si nous apprenons qu\'un compte a été créé par une personne qui n\'a pas l\'âge requis, nous pouvons le suspendre. HALTE, qui ne demande pas de compte, accueille toute personne qui a besoin d\'aide.',
        ],
    },
    {
        title: '18. Modification de cette politique',
        paragraphs: [
            'Cette politique peut évoluer. Toute modification substantielle te sera communiquée par un moyen approprié avant son entrée en vigueur.',
        ],
    },
    {
        title: '19. Contact',
        paragraphs: [`Pour toute question relative à cette politique : ${CONTACT}`],
    },
];

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>

                <div className="bg-white rounded-3xl p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Politique de confidentialité</h1>
                        <p className="text-xs text-gray-400 mt-1">Dernière mise à jour : 31 octobre 2026 — Version 2.0</p>
                    </div>

                    {BLOCKS.map((b, i) => (
                        <section key={i} className="space-y-2">
                            {b.title && <h2 className="font-bold text-gray-800">{b.title}</h2>}
                            {b.paragraphs?.map((p) => <p key={p}>{p}</p>)}
                            {b.items && (
                                <ul className="list-disc pl-5 space-y-1">
                                    {b.items.map((it) => <li key={it}>{it}</li>)}
                                </ul>
                            )}
                            {b.label2 && <p className="pt-1">{b.label2}</p>}
                            {b.items2 && (
                                <ul className="list-disc pl-5 space-y-1">
                                    {b.items2.map((it) => <li key={it}>{it}</li>)}
                                </ul>
                            )}
                        </section>
                    ))}

                    <p className="text-xs text-gray-400">
                        Voir aussi : <Link to="/terms" className="underline">Conditions d'utilisation</Link> · <Link to="/documentation" className="underline">Comment ça marche</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

// src/pages/TermsPage.tsx — Vanessa
import { Link } from 'react-router-dom';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>

                <div className="bg-white rounded-3xl p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Conditions Générales d'Utilisation</h1>
                        <p className="text-xs text-gray-400 mt-1">Dernière mise à jour : 31 octobre 2026 — Version 2.0</p>
                    </div>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 1 — Objet et acceptation</h2>
                        <p>
                            Les présentes Conditions Générales d'Utilisation (ci-après "CGU") régissent
                            l'accès et l'utilisation de la plateforme "Vanessa" (ci-après "la
                            Plateforme"), éditée par ASILLIA, accessible notamment via le site kinemaplus.com et les
                            applications mobiles associées.
                        </p>
                        <p>
                            L'accès et l'utilisation de la Plateforme impliquent l'acceptation pleine,
                            entière et sans réserve des présentes CGU. Si tu n'acceptes pas ces
                            conditions, tu ne dois pas utiliser la Plateforme.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 2 — Description du service</h2>
                        <p>
                            "Vanessa" est une plateforme dont le cœur est un assistant conversationnel
                            automatisé, « l'IA des Béninois », reposant sur un modèle d'intelligence
                            artificielle : il aide à s'informer sur le Bénin et peut aussi discuter
                            librement. La Plateforme comprend en outre :
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>"Ça Parle", un réseau social où les utilisateurs publient, consultent,
                                commentent et réagissent à des témoignages, rumeurs, révélations et
                                commentaires ("le Contenu"), organisés notamment autour de fiches de
                                référence, avec un onglet « UAC » : menu des restaurants universitaires,
                                actualités publiées par les utilisateurs (concours, locations, emplois,
                                soutenances, excursions) et carte du campus de l'Université
                                d'Abomey-Calavi ;</li>
                            <li>"Ça sert", un répertoire local de bons plans et de prix ;</li>
                            <li>"Zem", un moteur de recherche dans une sélection de sites béninois, de
                                fiches de l'équipe et de connaissances de Vanessa ;</li>
                            <li>"HALTE", un moyen de demander de l'aide en cas de violence ;</li>
                            <li>une messagerie privée, un espace de notes personnelles ("Mon cahier")
                                et des fonctionnalités de gamification (badges, réputation,
                                prédictions).</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 3 — Conditions d'accès</h2>
                        <p>
                            L'inscription est réservée aux personnes physiques âgées d'au moins
                            18 ans au moment de la
                            création du compte. En créant un compte, tu déclares et garantis remplir
                            cette condition d'âge et disposer de la capacité juridique nécessaire.
                        </p>
                        <p>
                            La création d'un compte nécessite une adresse email valide, qui doit être
                            vérifiée avant toute activation. Un même utilisateur ne peut détenir qu'un
                            seul compte, sauf autorisation expresse de l'éditeur.
                        </p>
                        <p>
                            HALTE peut être utilisé sans compte et par toute personne qui a besoin
                            d'aide.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 4 — Contenu publié par les utilisateurs</h2>
                        <p>
                            <strong>4.1 Responsabilité de l'auteur.</strong> Chaque utilisateur est
                            seul responsable du Contenu qu'il publie, y compris lorsqu'il est publié en
                            mode anonyme. L'éditeur de la Plateforme agit en qualité d'hébergeur au sens
                            de la réglementation applicable et n'exerce pas de contrôle éditorial a
                            priori sur les publications.
                        </p>
                        <p>
                            <strong>4.2 Contenus strictement interdits.</strong> Sont notamment
                            prohibés, sans que cette liste soit exhaustive :
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Tout propos diffamatoire, c'est-à-dire imputant à une personne
                                identifiée ou identifiable un fait précis portant atteinte à son
                                honneur ou à sa considération, sans en rapporter la preuve ;</li>
                            <li>Le harcèlement, les menaces, l'intimidation ou l'incitation à la
                                violence envers une personne ou un groupe ;</li>
                            <li>La divulgation de données personnelles d'un tiers (adresse, numéro de
                                téléphone, informations médicales, financières...) sans son
                                consentement explicite ("doxxing") ;</li>
                            <li>Tout contenu à caractère sexuel impliquant des personnes réelles
                                identifiables, et de façon absolue tout contenu impliquant ou
                                suggérant l'implication de mineurs, qui fera l'objet d'un signalement
                                systématique aux autorités compétentes ;</li>
                            <li>La désinformation présentée comme un fait avéré alors qu'elle ne
                                repose sur aucun élément vérifiable ;</li>
                            <li>Toute usurpation d'identité ;</li>
                            <li>Tout contenu contrefaisant les droits de propriété intellectuelle
                                d'un tiers.</li>
                        </ul>
                        <p>
                            <strong>4.3 Licence concédée à l'éditeur.</strong> En publiant du Contenu,
                            tu concèdes à l'éditeur une licence non exclusive, gratuite et mondiale
                            d'utilisation, de reproduction et d'affichage de ce Contenu, dans la seule
                            mesure nécessaire au fonctionnement, à la promotion et à l'amélioration de
                            la Plateforme. Tu conserves tous tes droits de propriété intellectuelle sur
                            ton Contenu.
                        </p>
                        <p>
                            <strong>4.4 Actualités de l'espace UAC.</strong> Les actualités (concours,
                            locations, emplois, soutenances, excursions) sont publiées sous ton nom et
                            sous ta responsabilité. Tu t'engages à ce qu'elles soient exactes (dates,
                            lieux, conditions, contact) et à ne publier ni fausse annonce, ni offre
                            d'emploi ou de location inexistante, ni demande d'argent sous un faux
                            prétexte, ni information personnelle d'un tiers. Les actualités ne sont pas
                            vérifiées avant leur mise en ligne : l'éditeur ne garantit pas leur
                            exactitude et te recommande, pour une location ou un emploi, de ne jamais
                            payer avant d'avoir vu le lieu ou rencontré la personne. L'éditeur peut les
                            masquer ou les supprimer à tout moment, et limite le nombre de publications
                            par personne et par jour.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 5 — Anonymat et traçabilité</h2>
                        <p>
                            La fonctionnalité de publication anonyme masque l'identité de l'auteur aux
                            autres utilisateurs de la Plateforme. Elle ne garantit en aucun cas
                            l'anonymat vis-à-vis de l'éditeur, qui conserve techniquement le lien entre
                            un compte et son Contenu, ni vis-à-vis des autorités judiciaires ou
                            administratives compétentes, notamment en cas de réquisition légale ou de
                            procédure judiciaire portant sur un contenu illicite.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 6 — Modération</h2>
                        <p>
                            L'éditeur se réserve le droit, à sa seule discrétion et sans préavis, de
                            masquer, modifier ou supprimer tout Contenu contraire aux présentes CGU, et
                            de suspendre ou résilier tout compte en cas de manquement, qu'il soit
                            signalé par un tiers ou constaté directement.
                        </p>
                        <p>
                            La Plateforme met à disposition un système de signalement permettant à tout
                            utilisateur de porter à la connaissance de l'équipe de modération un
                            contenu qu'il estime contraire aux présentes CGU. L'éditeur s'efforce de
                            traiter les signalements dans un délai raisonnable, sans garantir de délai
                            précis.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 7 — Assistant IA ("Vanessa")</h2>
                        <p>
                            Vanessa est une intelligence artificielle, et non une personne. Ses
                            réponses, publications et suggestions sont générées automatiquement à
                            partir d'un modèle de langage et des notes que l'équipe et ses partenaires
                            ont rédigées ; elles ne constituent ni un conseil professionnel
                            (juridique, médical, psychologique, administratif ou autre), ni
                            l'expression d'une opinion humaine engageant l'éditeur. Elles peuvent être
                            imprécises, incomplètes, dépassées ou inappropriées dans certains contextes
                            : vérifie toujours une information importante (démarche, date, prix,
                            adresse) auprès de la structure concernée.
                        </p>
                        <p>
                            Vanessa choisit elle-même, selon ta question, les connaissances à utiliser,
                            y compris celles de partenaires. Une information sponsorisée est toujours
                            signalée par la mention « PUB : » à la fin de la réponse. Pour que le
                            service reste disponible pour tous, le nombre d'échanges par jour et par
                            personne est limité.
                        </p>
                        <p>
                            Aucun contenu confié à Vanessa dans le cadre d'une conversation privée
                            n'est réutilisé pour alimenter les publications ou les échanges avec
                            d'autres utilisateurs, sauf action explicite et volontaire de l'utilisateur
                            lui-même (transformation en publication, nécessitant une validation
                            manuelle avant toute mise en ligne). Tes notes de « Mon cahier » ne sont
                            utilisées par Vanessa que lorsque tu le lui demandes clairement.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 8 — Fonctionnalités communautaires</h2>
                        <p>
                            Les statuts affichés sur les publications (rumeur, en vérification,
                            confirmé, démenti) reflètent l'appréciation de la communauté et/ou de
                            l'auteur à un instant donné. Ils ne constituent en aucun cas une
                            certification journalistique, juridique ou factuelle de la véracité d'un
                            contenu. L'éditeur ne garantit pas l'exactitude des informations publiées
                            par les utilisateurs.
                        </p>
                        <p>
                            La fonctionnalité "Ça sert" (bons plans, lieux, services, prix) fonctionne
                            selon le même principe : chaque contribution est soumise à une vérification
                            avant publication, mais reste une information fournie par un tiers, que
                            l'éditeur ne garantit ni exacte ni à jour. La position géographique d'un
                            lieu est indiquée par son auteur, sous sa seule responsabilité — vérifie
                            toujours sur place avant de t'y fier entièrement. Publier une position ou
                            une information volontairement fausse ou trompeuse constitue un manquement
                            aux présentes conditions et peut entraîner la suppression du contenu et/ou
                            une sanction du compte.
                        </p>
                        <p>
                            Le menu des restaurants universitaires et la carte du campus (lieux et
                            itinéraires) sont fournis à titre indicatif. Un menu peut changer
                            exceptionnellement, un lieu peut être mal placé ou manquant, et un
                            itinéraire est une estimation : l'éditeur ne garantit pas leur exactitude.
                            La géolocalisation n'est utilisée que lorsque tu la demandes.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 9 — Zem</h2>
                        <p>
                            Zem affiche des extraits de pages publiées par des tiers et renvoie vers
                            leur site d'origine. L'éditeur n'est pas l'auteur de ces pages et ne
                            garantit ni leur exactitude, ni leur mise à jour, ni leur disponibilité.
                            La « réponse rapide » recopie des passages des pages trouvées ; elle ne
                            remplace pas la consultation de la source. Si tu édites un site et ne
                            souhaites pas y figurer, ou si tu constates une erreur, signale-le : nous
                            examinons la demande.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 10 — HALTE</h2>
                        <p>
                            HALTE permet de demander de l'aide à une cellule d'écoute, qui peut te
                            rappeler. Il ne remplace en aucun cas les services d'urgence : en cas de
                            danger immédiat, appelle-les d'abord. Le temps de réponse de la cellule ne
                            peut pas être garanti, et le service peut ne pas être ouvert dans toutes
                            les zones.
                        </p>
                        <p>
                            Demande de l'aide de bonne foi. Il est interdit d'accuser volontairement et
                            à tort une personne ou d'utiliser HALTE pour nuire à quelqu'un. Cette règle
                            ne vise jamais une personne qui demande de l'aide sincèrement, même si elle
                            se trompe. La cellule ne transmet une alerte à une autorité qu'après avoir
                            pris contact avec toi et évalué la situation, sauf obligation légale.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 11 — Comptes et sécurité</h2>
                        <p>
                            Tu es responsable de la confidentialité de tes identifiants de connexion et
                            de toute activité effectuée depuis ton compte. Tu t'engages à informer
                            immédiatement l'éditeur de toute utilisation non autorisée de ton compte.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 12 — Limitation de responsabilité</h2>
                        <p>
                            Dans les limites autorisées par la loi applicable, l'éditeur ne saurait être
                            tenu responsable des dommages directs ou indirects résultant de
                            l'utilisation de la Plateforme, du contenu publié par les utilisateurs, ou
                            de l'indisponibilité temporaire du service. La Plateforme est fournie "en
                            l'état", sans garantie de fonctionnement ininterrompu ou exempt d'erreurs.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 13 — Résiliation</h2>
                        <p>
                            Tu peux cesser d'utiliser la Plateforme à tout moment. L'éditeur peut
                            suspendre ou résilier ton accès en cas de violation des présentes CGU, sans
                            préavis en cas de manquement grave.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 14 — Modification des CGU</h2>
                        <p>
                            L'éditeur se réserve le droit de modifier les présentes CGU à tout moment.
                            Les utilisateurs seront informés de toute modification substantielle par un
                            moyen approprié (notification, bannière, email). La poursuite de
                            l'utilisation de la Plateforme après modification vaut acceptation des
                            nouvelles conditions.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 15 — Droit applicable et litiges</h2>
                        <p>
                            À titre indicatif, les
                            présentes CGU pourraient être soumises au droit international, tout
                            litige relevant, à défaut de résolution amiable, de la compétence des
                            juridictions.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 16 — Contact</h2>
                        <p>Pour toute question relative aux présentes CGU : seriquicinee@gmail.com</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
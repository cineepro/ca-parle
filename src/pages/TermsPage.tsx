// src/pages/TermsPage.tsx — Ça Parle
import { Link } from 'react-router-dom';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>

                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm">
                    ⚠️ Ce document est une rédaction complète destinée à servir de base de travail.
                    Il ne constitue pas un conseil juridique définitif et doit être relu, adapté et
                    validé par un professionnel du droit (notamment sur le droit applicable, la
                    responsabilité liée au contenu généré par les utilisateurs, et la conformité aux
                    réglementations locales) avant toute publication engageant réellement la
                    plateforme.
                </div>

                <div className="bg-white rounded-3xl p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Conditions Générales d'Utilisation</h1>
                        <p className="text-xs text-gray-400 mt-1">Dernière mise à jour : [à compléter] — Version 1.0</p>
                    </div>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 1 — Objet et acceptation</h2>
                        <p>
                            Les présentes Conditions Générales d'Utilisation (ci-après "CGU") régissent
                            l'accès et l'utilisation de la plateforme "Ça Parle" (ci-après "la
                            Plateforme"), éditée par [Nom légal de l'éditeur / raison sociale à
                            compléter], accessible notamment via le site kinemaplus.com et les
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
                            Ça Parle est un service de réseau social permettant à ses utilisateurs de
                            publier, consulter, commenter et réagir à des contenus de type témoignages,
                            rumeurs, révélations et commentaires ("le Contenu"), organisés notamment
                            autour de fiches de référence (personnes publiques, sujets, événements). La
                            Plateforme intègre également un assistant conversationnel automatisé
                            ("Vanessa") reposant sur un modèle d'intelligence artificielle, une
                            messagerie privée, et des fonctionnalités de gamification (badges,
                            réputation, prédictions).
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 3 — Conditions d'accès</h2>
                        <p>
                            L'inscription est réservée aux personnes physiques âgées d'au moins
                            [16/18 ans — à trancher selon la juridiction cible] au moment de la
                            création du compte. En créant un compte, tu déclares et garantis remplir
                            cette condition d'âge et disposer de la capacité juridique nécessaire.
                        </p>
                        <p>
                            La création d'un compte nécessite une adresse email valide, qui doit être
                            vérifiée avant toute activation. Un même utilisateur ne peut détenir qu'un
                            seul compte, sauf autorisation expresse de l'éditeur.
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
                            Vanessa est un personnage automatisé généré par un modèle de langage
                            artificiel. Ses réponses, publications et suggestions sont générées
                            automatiquement et ne constituent ni un conseil professionnel (juridique,
                            médical, psychologique ou autre), ni l'expression d'une opinion humaine
                            engageant l'éditeur. L'utilisateur reconnaît que le contenu généré par
                            Vanessa peut être imprécis, incomplet ou inapproprié dans certains contextes
                            et s'engage à l'apprécier avec le recul nécessaire.
                        </p>
                        <p>
                            Aucun contenu confié à Vanessa dans le cadre d'une conversation privée
                            n'est réutilisé pour alimenter les publications ou les échanges avec
                            d'autres utilisateurs, sauf action explicite et volontaire de l'utilisateur
                            lui-même (fonctionnalité de transformation en publication, nécessitant une
                            validation manuelle avant toute mise en ligne).
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
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 9 — Comptes et sécurité</h2>
                        <p>
                            Tu es responsable de la confidentialité de tes identifiants de connexion et
                            de toute activité effectuée depuis ton compte. Tu t'engages à informer
                            immédiatement l'éditeur de toute utilisation non autorisée de ton compte.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 10 — Limitation de responsabilité</h2>
                        <p>
                            Dans les limites autorisées par la loi applicable, l'éditeur ne saurait être
                            tenu responsable des dommages directs ou indirects résultant de
                            l'utilisation de la Plateforme, du contenu publié par les utilisateurs, ou
                            de l'indisponibilité temporaire du service. La Plateforme est fournie "en
                            l'état", sans garantie de fonctionnement ininterrompu ou exempt d'erreurs.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 11 — Résiliation</h2>
                        <p>
                            Tu peux cesser d'utiliser la Plateforme à tout moment. L'éditeur peut
                            suspendre ou résilier ton accès en cas de violation des présentes CGU, sans
                            préavis en cas de manquement grave.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 12 — Modification des CGU</h2>
                        <p>
                            L'éditeur se réserve le droit de modifier les présentes CGU à tout moment.
                            Les utilisateurs seront informés de toute modification substantielle par un
                            moyen approprié (notification, bannière, email). La poursuite de
                            l'utilisation de la Plateforme après modification vaut acceptation des
                            nouvelles conditions.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 13 — Droit applicable et litiges</h2>
                        <p>
                            [Clause à finaliser avec un juriste selon le ou les pays visés par
                            l'exploitation commerciale de la Plateforme.] À titre indicatif, les
                            présentes CGU pourraient être soumises au droit de [pays à déterminer], tout
                            litige relevant, à défaut de résolution amiable, de la compétence des
                            juridictions de [ressort à déterminer].
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">Article 14 — Contact</h2>
                        <p>Pour toute question relative aux présentes CGU : [email de contact à compléter]</p>
                    </section>
                </div>
            </div>
        </div>
    );
}

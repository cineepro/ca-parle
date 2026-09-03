// src/pages/PrivacyPage.tsx — Ça Parle
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>

                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm">
                    ⚠️ Ce document est une rédaction complète de la dernière mise à jour.
                </div>

                <div className="bg-white rounded-3xl p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Politique de confidentialité</h1>
                        <p className="text-xs text-gray-400 mt-1">Dernière mise à jour : — Version 1.0</p>
                    </div>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">1. Qui sommes-nous</h2>
                        <p>
                            La présente politique décrit comment ASILLIA
                            ("nous"), éditeur de la plateforme Ça Parle, collecte, utilise et protège
                            les données personnelles des utilisateurs ("toi", "tu").
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">2. Données que nous collectons</h2>
                        <p><strong>Données fournies directement par toi :</strong></p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Nom, adresse email, mot de passe (stocké de façon chiffrée, jamais en clair)</li>
                            <li>Numéro de téléphone — optionnel, uniquement si tu choisis de le renseigner</li>
                            <li>Contenu que tu publies : histoires, commentaires, réactions, votes de
                                prédiction, messages privés (texte et vocaux)</li>
                            <li>Enregistrements audio, lorsque tu utilises la fonctionnalité de
                                message vocal — transcrits automatiquement en texte pour le
                                fonctionnement du service</li>
                        </ul>
                        <p className="mt-2"><strong>Données collectées automatiquement :</strong></p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Adresse IP, type d'appareil et de navigateur</li>
                            <li>Journaux techniques de connexion (dates, heures, pages consultées) à
                                des fins de sécurité et de lutte contre les abus</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">3. Pourquoi nous utilisons ces données</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Fournir et sécuriser le service (authentification, affichage du
                                contenu, messagerie)</li>
                            <li>Assurer la modération et la lutte contre les comportements abusifs</li>
                            <li>Te contacter pour des besoins opérationnels (vérification d'email,
                                notifications d'activité, actualités si tu y as consenti)</li>
                            <li>Améliorer le service et son fonctionnement technique</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">4. L'intelligence artificielle sur la Plateforme</h2>
                        <p>
                            Certaines fonctionnalités (assistant conversationnel "Vanessa", génération
                            de réponses, transcription et synthèse vocale) reposent sur des modèles
                            d'intelligence artificielle exploités par des prestataires tiers
                            (notamment Anthropic pour la génération de texte, ElevenLabs pour la voix).
                            Le contenu que tu échanges avec ces fonctionnalités peut donc être transmis,
                            de façon strictement nécessaire à leur fonctionnement, à ces prestataires,
                            qui traitent ces données selon leurs propres politiques de confidentialité
                            et engagements contractuels de traitement de données.
                        </p>
                        <p>
                            Le contenu d'une conversation privée avec Vanessa n'est jamais réutilisé
                            pour répondre à un autre utilisateur ou alimenter une publication, sauf
                            action volontaire et explicite de ta part.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">5. Publication anonyme</h2>
                        <p>
                            Lorsque tu publies en anonyme, ton identité n'est pas affichée aux autres
                            utilisateurs. Elle reste néanmoins associée techniquement à ton compte dans
                            nos systèmes, notamment pour les besoins de modération et pour répondre à
                            une éventuelle obligation légale.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">6. Partage des données</h2>
                        <p>Tes données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec :</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Nos prestataires techniques (hébergement de la base de données et de
                                l'authentification, envoi d'emails, intelligence artificielle
                                conversationnelle et vocale) dans la stricte mesure nécessaire au
                                fonctionnement du service</li>
                            <li>Les autorités compétentes, en cas d'obligation légale ou de
                                réquisition judiciaire</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">7. Transferts internationaux de données</h2>
                        <p>
                            Certains de nos prestataires techniques sont situés en dehors de ton pays
                            de résidence, notamment aux États-Unis. Ces transferts sont encadrés par
                            les garanties contractuelles proposées par ces prestataires.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">8. Durée de conservation</h2>
                        <p>
                            Tes données sont conservées tant que ton compte est actif. En cas de
                            suppression de compte, tes données personnelles d'identification sont
                            supprimées ou anonymisées dans un délai raisonnable, sous réserve des
                            obligations légales de conservation qui pourraient s'appliquer à certaines
                            données (ex : logs de sécurité).
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">9. Tes droits</h2>
                        <p>
                            Sous réserve de la réglementation qui t'est applicable, tu disposes
                            notamment d'un droit d'accès, de rectification, d'effacement et
                            d'opposition concernant tes données personnelles. Pour exercer ces droits,
                            contacte-nous à seriquicinee@gmail.com. Nous nous efforçons de
                            répondre dans un délai raisonnable.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">10. Sécurité</h2>
                        <p>
                            Nous mettons en œuvre des mesures techniques raisonnables pour protéger tes
                            données (chiffrement des communications en transit via HTTPS, mots de
                            passe hachés, permissions d'accès restreintes sur nos systèmes). Aucun
                            système n'étant infaillible, nous ne pouvons garantir une sécurité absolue.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">11. Cookies et stockage local</h2>
                        <p>
                            La Plateforme utilise le stockage local de ton navigateur ou de ton
                            appareil pour maintenir ta session connectée et mémoriser certaines
                            préférences (ex : avoir déjà vu la bannière d'information). Nous n'utilisons
                            aucun cookie publicitaire ou de tracking tiers à des fins commerciales.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">12. Mineurs</h2>
                        <p>
                            La Plateforme n'est pas destinée aux personnes n'ayant pas l'âge minimum
                            requis par nos Conditions Générales d'Utilisation. Si nous prenons
                            connaissance qu'un compte a été créé par une personne n'atteignant pas cet
                            âge, nous nous réservons le droit de le suspendre.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">13. Modification de cette politique</h2>
                        <p>
                            Cette politique peut évoluer. Toute modification substantielle te sera
                            communiquée par un moyen approprié avant son entrée en vigueur.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">14. Contact</h2>
                        <p>Pour toute question relative à cette politique : seriquicinee@gmail.com</p>
                    </section>
                </div>
            </div>
        </div>
    );
}

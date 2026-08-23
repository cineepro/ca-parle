// src/pages/PrivacyPage.tsx — Ça Parle
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>

                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm">
                    ⚠️ Ceci est un modèle de politique de confidentialité généré comme point de
                    départ, à adapter à ta situation réelle (pays d'hébergement des données,
                    obligations RGPD ou équivalent local) et à faire relire par un professionnel
                    avant publication.
                </div>

                <div className="bg-white rounded-3xl p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
                    <h1 className="text-xl font-bold text-gray-800">Politique de confidentialité</h1>
                    <p className="text-xs text-gray-400">Dernière mise à jour : [à compléter]</p>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">1. Données que nous collectons</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Nom, adresse email, mot de passe (chiffré) — à l'inscription</li>
                            <li>Numéro de téléphone — optionnel, si tu choisis de le renseigner</li>
                            <li>Contenu que tu publies : histoires, commentaires, réactions, votes, messages privés</li>
                            <li>Données techniques : adresse IP, type d'appareil, journaux de connexion</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">2. Utilisation des données</h2>
                        <p>
                            Tes données servent à faire fonctionner le service (authentification,
                            affichage du contenu, notifications), à assurer la sécurité de la
                            plateforme (modération, lutte contre les abus), et à te contacter si
                            nécessaire (vérification d'email, notifications d'activité).
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">3. Publication anonyme</h2>
                        <p>
                            Quand tu publies une histoire ou un commentaire en anonyme, ton identité
                            n'est pas affichée aux autres utilisateurs. Elle reste toutefois connue de
                            la plateforme (associée techniquement à ton compte), notamment pour les
                            besoins de modération en cas de signalement.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">4. Partage des données</h2>
                        <p>
                            Tes données ne sont pas vendues à des tiers. Elles peuvent être partagées
                            avec les prestataires techniques nécessaires au fonctionnement du service
                            (hébergement, base de données), et communiquées aux autorités compétentes
                            en cas d'obligation légale.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">5. Conservation des données</h2>
                        <p>
                            Tes données sont conservées tant que ton compte est actif. Tu peux
                            demander la suppression de ton compte et de tes données à [contact à
                            compléter].
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">6. Tes droits</h2>
                        <p>
                            Selon la réglementation applicable, tu disposes d'un droit d'accès, de
                            rectification et de suppression de tes données personnelles. Pour exercer
                            ces droits, contacte-nous à [email de contact à compléter].
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">7. Cookies et stockage local</h2>
                        <p>
                            La plateforme utilise le stockage local de ton navigateur pour maintenir ta
                            session connectée. Aucun cookie publicitaire tiers n'est utilisé.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
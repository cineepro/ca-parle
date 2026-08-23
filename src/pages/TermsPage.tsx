// src/pages/TermsPage.tsx — Ça Parle
import { Link } from 'react-router-dom';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>

                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm">
                    ⚠️ Ceci est un modèle de conditions d'utilisation généré comme point de départ.
                    Il ne constitue pas un conseil juridique et doit être relu et adapté par un
                    professionnel du droit avant toute publication réelle — en particulier les
                    clauses sur le contenu généré par les utilisateurs, la diffamation et la
                    modération, sensibles pour une plateforme comme Ça Parle.
                </div>

                <div className="bg-white rounded-3xl p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
                    <h1 className="text-xl font-bold text-gray-800">Conditions d'utilisation</h1>
                    <p className="text-xs text-gray-400">Dernière mise à jour : [à compléter]</p>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">1. Objet</h2>
                        <p>
                            Ça Parle est une plateforme sociale permettant à ses utilisateurs de publier,
                            commenter et réagir à des histoires, rumeurs, témoignages et révélations.
                            L'utilisation du service implique l'acceptation pleine et entière des
                            présentes conditions.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">2. Âge minimum</h2>
                        <p>
                            L'inscription est réservée aux personnes âgées d'au moins [16/18 — à
                            trancher] ans. En créant un compte, tu déclares remplir cette condition.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">3. Contenu publié par les utilisateurs</h2>
                        <p>
                            Tu restes responsable du contenu que tu publies (histoires, commentaires,
                            témoignages). Sont notamment interdits : la diffamation, le harcèlement, les
                            fausses informations présentées comme vérifiées, la divulgation de données
                            privées d'un tiers sans son consentement, le contenu à caractère sexuel
                            concernant des personnes réelles, et plus généralement tout contenu
                            illégal.
                        </p>
                        <p>
                            L'anonymat proposé par la plateforme protège ton identité vis-à-vis des
                            autres utilisateurs, pas vis-à-vis de la plateforme elle-même ni des
                            autorités compétentes en cas de réquisition légale.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">4. Modération</h2>
                        <p>
                            Ça Parle se réserve le droit de masquer, supprimer tout contenu signalé et
                            jugé contraire aux présentes conditions, et de suspendre ou bannir tout
                            compte en cas de manquement grave ou répété, à sa discrétion.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">5. Compte utilisateur</h2>
                        <p>
                            Tu es responsable de la confidentialité de tes identifiants. Un email
                            valide et vérifié est requis pour activer ton compte.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">6. Limitation de responsabilité</h2>
                        <p>
                            Ça Parle héberge du contenu généré par les utilisateurs et ne garantit pas
                            l'exactitude, la véracité ou la fiabilité des histoires, rumeurs ou
                            témoignages publiés. Les statuts affichés (rumeur, en vérification,
                            confirmé, démenti) reflètent les informations disponibles à un instant
                            donné et ne constituent pas une certification journalistique.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">7. Modification des conditions</h2>
                        <p>
                            Ces conditions peuvent évoluer. Les utilisateurs seront informés de toute
                            modification substantielle.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-bold text-gray-800">8. Contact</h2>
                        <p>Pour toute question : [email de contact à compléter]</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
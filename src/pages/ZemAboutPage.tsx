// src/pages/ZemAboutPage.tsx — Zem
// « Comment Zem fonctionne et d'où viennent les résultats » : la transparence qui donne confiance.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { moteurService, type ZemPublicStats } from '@/features/moteur/services/moteurService';
import { CATEGORY_META } from '@/features/moteur/lib/phrases';
import { ZemRider } from '@/features/moteur/components/ZemRider';

const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="bg-white rounded-3xl border border-gray-100 p-5">
        <h2 className="font-bold text-ink">{title}</h2>
        <div className="mt-2 space-y-2 text-sm text-gray-700">{children}</div>
    </section>
);

export default function ZemAboutPage() {
    const [stats, setStats] = useState<ZemPublicStats | null>(null);
    useEffect(() => { moteurService.publicStats().then(setStats).catch(() => setStats(null)); }, []);
    const rate = stats?.searches7d && stats.answered7d != null ? Math.round((stats.answered7d / stats.searches7d) * 100) : null;

    return (
        <div className="min-h-screen bg-cream">
            <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-4">
                <div className="flex items-center gap-3">
                    <Link to="/zem" className="text-gray-400 hover:text-gray-600" aria-label="Retour à Zem">←</Link>
                    <ZemRider size="sm" className="w-12" />
                    <h1 className="text-xl font-extrabold text-ink">Comment Zem fonctionne</h1>
                </div>

                <Block title="Zem en bref">
                    <p>Zem est le moteur de recherche de Vanessa pour le Bénin. Il ne cherche pas sur tout internet : il cherche dans une sélection de sites béninois choisis par l’équipe, plus des fiches écrites à la main et des connaissances de Vanessa sur le Bénin.</p>
                </Block>

                <Block title="Zem en chiffres">
                    {!stats ? <p className="text-gray-400">Chargement…</p> : (
                        <ul className="grid grid-cols-2 gap-2">
                            <li className="rounded-2xl bg-sand p-3"><span className="block text-2xl font-bold text-ink">{stats.pages}</span>pages lues</li>
                            <li className="rounded-2xl bg-sand p-3"><span className="block text-2xl font-bold text-ink">{stats.sources.length || '—'}</span>sites suivis</li>
                            <li className="rounded-2xl bg-sand p-3"><span className="block text-base font-bold text-ink">{when(stats.lastUpdateAt)}</span>dernière mise à jour</li>
                            <li className="rounded-2xl bg-sand p-3"><span className="block text-2xl font-bold text-ink">{rate === null ? '—' : `${rate} %`}</span>des recherches de la semaine ont trouvé une réponse</li>
                        </ul>
                    )}
                </Block>

                <Block title="D’où viennent les résultats">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Des sites publics</strong> : un robot visite régulièrement les pages de sites d’information, d’administrations, d’écoles et de services. Il lit le texte et le range dans l’index de Zem.</li>
                        <li><strong>Des fiches de l’équipe</strong> : des informations vérifiées et écrites à la main.</li>
                        <li><strong>Les connaissances de Vanessa</strong> : ses notes sur le Bénin, validées par l’équipe, et les notes de ses partenaires. Elles sont lisibles par tous les utilisateurs connectés. Tes notes personnelles (« Mon cahier ») n’y sont jamais.</li>
                    </ul>
                    {stats && stats.sources.length > 0 && (
                        <details className="mt-2">
                            <summary className="cursor-pointer font-semibold text-ochre">Voir les {stats.sources.length} sites suivis</summary>
                            <ul className="mt-2 space-y-1">
                                {stats.sources.map((s) => (
                                    <li key={s.host}>{s.label} <span className="text-gray-400">· {s.host} · {CATEGORY_META[s.category]?.label || 'Autre'}</span></li>
                                ))}
                            </ul>
                        </details>
                    )}
                </Block>

                <Block title="Nos règles">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Le robot respecte le fichier <code>robots.txt</code> de chaque site et s’en va si un site ne veut pas être lu. Il espace ses visites pour ne jamais surcharger un site.</li>
                        <li>Zem montre <strong>un extrait</strong> et renvoie toujours vers le site d’origine, qui mérite la visite.</li>
                        <li>La « réponse rapide » recopie des phrases des pages trouvées, sans rien inventer ni reformuler, et cite ses sources.</li>
                        <li>Les recherches sont enregistrées <strong>sans ton nom</strong>, seulement pour voir ce qui manque.</li>
                        <li>Les pages en lecture récente sont gardées sur ton appareil pour être relues sans connexion, et nulle part ailleurs.</li>
                    </ul>
                </Block>

                <Block title="Une erreur ? Un site à retirer ?">
                    <p>Ouvre une page dans Zem et touche « Signaler un problème » : l’équipe la vérifie. Si tu édites un site et que tu ne veux pas y figurer, ou si tu veux nous suggérer un site à ajouter, dis-le-nous avec « Proposer une expression à Vanessa » dans le menu.</p>
                </Block>

                <p className="text-center"><Link to="/zem" className="inline-block rounded-full bg-brand text-ink font-bold px-6 min-h-[44px] leading-[44px]">Retour à Zem</Link></p>
            </div>
        </div>
    );
}

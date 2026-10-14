// src/features/console/components/ConsoleUsers.tsx — Vanessa
// Recherche d'utilisateurs pour la Console. Rien n'est chargé à l'ouverture :
// la recherche ne part qu'à la validation (Entrée ou bouton), ce qui limite
// les lectures même avec des milliers de comptes.
import { useState } from 'react';
import { platformService, timeAgo, type UserSummary, type UserDetail } from '../services/platformService';

const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between gap-3 py-1.5 text-sm border-b border-gray-50 last:border-0">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold text-gray-800 text-right break-all">{value}</span>
    </div>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
        {children}
    </div>
);

export const ConsoleUsers = () => {
    const [q, setQ] = useState('');
    const [results, setResults] = useState<UserSummary[] | null>(null);
    const [source, setSource] = useState<'comptes' | 'profils' | null>(null);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detail, setDetail] = useState<UserDetail | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const search = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const term = q.trim();
        if (term.length < 2 || searching) return;
        setSearching(true);
        setError(null);
        setDetail(null);
        try {
            const r = await platformService.searchUsers(term);
            setResults(r.users);
            setSource(r.source);
        } catch (err: any) {
            setError(err.message || 'Recherche impossible.');
        } finally {
            setSearching(false);
        }
    };

    const open = async (id: string) => {
        setLoadingId(id);
        setError(null);
        try {
            const r = await platformService.userDetail(id);
            setDetail(r.user);
        } catch (err: any) {
            setError(err.message || 'Fiche introuvable.');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={search} className="flex gap-2">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Nom, e-mail, téléphone ou identifiant"
                    className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                />
                <button
                    type="submit"
                    disabled={q.trim().length < 2 || searching}
                    className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
                >
                    {searching ? 'Recherche...' : 'Chercher'}
                </button>
            </form>
            <p className="text-xs text-gray-400">
                Aucune liste n'est chargée à l'ouverture : tape au moins 2 caractères puis valide. Une recherche affiche 10 comptes au maximum.
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {source === 'profils' && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3">
                    Recherche limitée au nom, e-mail exact ou identifiant, et dernière connexion indisponible : ajoute l'autorisation
                    « users.read » à la clé API de la Function platform-overview pour l'activer.
                </p>
            )}

            {results && results.length === 0 && !searching && (
                <div className="bg-white rounded-3xl p-8 text-center text-gray-400 text-sm">Aucun utilisateur trouvé.</div>
            )}

            {results && results.length > 0 && !detail && (
                <div className="space-y-2">
                    {results.map((u) => (
                        <button
                            key={u.id}
                            onClick={() => open(u.id)}
                            disabled={loadingId === u.id}
                            className="w-full text-left bg-white rounded-2xl border border-gray-100 p-3.5 hover:border-brand transition-colors"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                        {u.name || 'Sans nom'}
                                        {u.isModerator && <span className="ml-2 text-xs text-ochre">Modérateur</span>}
                                        {u.isBanned && <span className="ml-2 text-xs text-red-600">Banni</span>}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">{u.email || u.phone || u.id}</p>
                                </div>
                                <span className="text-xs text-gray-400 shrink-0">
                                    {loadingId === u.id ? 'Ouverture...' : `inscrit le ${fmtDate(u.createdAt)}`}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {detail && (
                <div className="space-y-3">
                    <button onClick={() => setDetail(null)} className="text-xs font-semibold text-ochre">← Retour aux résultats</button>

                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-center gap-3">
                            {detail.avatarUrl
                                ? <img src={detail.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                                : <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">{(detail.name || '?')[0]}</div>}
                            <div className="min-w-0">
                                <p className="font-bold text-gray-800 truncate">{detail.name || 'Sans nom'}</p>
                                <p className="text-xs text-gray-400 break-all">{detail.id}</p>
                            </div>
                        </div>
                        {detail.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {detail.tags.map((t) => (
                                    <span key={t} className="text-xs font-semibold rounded-full bg-gray-100 text-gray-600 px-2.5 py-1">{t}</span>
                                ))}
                            </div>
                        )}
                        {detail.bio && <p className="text-sm text-gray-500 mt-3">{detail.bio}</p>}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Card title="Compte">
                            <Row label="E-mail" value={detail.email || '—'} />
                            <Row label="E-mail vérifié" value={detail.emailVerified === null ? '—' : detail.emailVerified ? 'Oui' : 'Non'} />
                            <Row label="Téléphone" value={detail.phone || '—'} />
                            <Row label="Inscription" value={fmtDate(detail.createdAt)} />
                            <Row label="Dernière connexion" value={detail.lastAccessAt ? `${timeAgo(detail.lastAccessAt)} (${fmtDate(detail.lastAccessAt)})` : '—'} />
                            <Row label="Statut du compte" value={detail.accountStatus ?? '—'} />
                        </Card>
                        <Card title="Argent et réputation">
                            <Row label="Solde" value={detail.balance} />
                            <Row label="Score de réputation" value={detail.reputationScore} />
                            <Row label="Indice de fiabilité" value={detail.reliabilityIndex} />
                            <Row label="Niveau de ragots" value={detail.gossipLevel} />
                            <Row label="Prédictions justes" value={`${detail.predictionsCorrect} / ${detail.predictionsTotal}`} />
                        </Card>
                        <Card title="Activité">
                            <Row label="Publications" value={detail.storiesCount} />
                            <Row label="Révélations" value={detail.revelationsCount} />
                            <Row label="Commentaires" value={detail.commentsCount} />
                            <Row label="Abonnés / abonnements" value={`${detail.followers} / ${detail.following}`} />
                        </Card>
                        <Card title="Préférences et statut">
                            <Row label="Publie en anonyme par défaut" value={detail.defaultAnonymous ? 'Oui' : 'Non'} />
                            <Row label="Newsletter" value={detail.newsletterOptOut ? 'Désactivée' : 'Activée'} />
                            <Row label="Vérifié" value={detail.isVerified ? 'Oui' : 'Non'} />
                            <Row label="Créateur" value={detail.isCreative ? 'Oui' : 'Non'} />
                            <Row label="Modérateur" value={detail.isModerator ? 'Oui' : 'Non'} />
                            <Row label="Banni" value={detail.isBanned ? 'Oui' : 'Non'} />
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

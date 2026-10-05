// src/features/vanessa/components/VanessaKnowledgeManager.tsx — Vanessa
//
// La page ne charge JAMAIS toute la base d'un coup : on choisit d'abord un
// TYPE de connaissance (expressions, urgence, générale, ou un connecteur),
// puis un STATUT ("À activer" par défaut, ou "Activées"), et seules ces
// notes-là sont lues, 25 par page. Avant, chaque ouverture relisait des
// centaines de notes de tous les types mélangés : un défilement
// interminable et un coût de lecture Appwrite qui grossissait avec la base.
import { useState, useEffect, useRef } from 'react';
import {
    vanessaKnowledgeService,
    type VanessaKnowledge,
    type KnowledgeScope,
    type PendingCounts,
} from '../services/vanessaKnowledgeService';
import { Button } from '@/components/ui/button';

// Catégories techniques reconnues par la Function send-message :
// - URGENT_CATEGORY : toujours incluse, uniquement utilisée sur un sujet grave.
// - LEXICON_CATEGORY : toujours incluse, c'est le vocabulaire/ton propre de Vanessa.
// Ne jamais renommer sans changer aussi les constantes équivalentes côté
// Functions (URGENT_RESOURCES_CATEGORY / LEXICON_CATEGORY).
const URGENT_CATEGORY = 'ressources_urgence';
const LEXICON_CATEGORY = 'lexique';

type StatusTab = 'pending' | 'active';

const SCOPE_META: Record<KnowledgeScope, { label: string; rowLabel: string; accent: string; help: string }> = {
    lexique: {
        label: '🗣️ Expressions',
        rowLabel: 'Expression',
        accent: 'border-indigo-100 bg-indigo-50/30',
        help: "Ce qui fait la différence de Vanessa : son registre familier et ses expressions. Toujours entièrement inclus dans ses réponses, même quand un connecteur partenaire est actif.",
    },
    urgence: {
        label: '🤍 Urgence',
        rowLabel: 'Ressource vérifiée',
        accent: 'border-rose-100 bg-rose-50/30',
        help: "Utilisées UNIQUEMENT quand une conversation touche un sujet grave (violence, détresse, grossesse non désirée...). Sans ressource ici, Vanessa reste volontairement générale plutôt que d'inventer un numéro ou une adresse. Vérifie chaque information avant de l'ajouter : une erreur peut faire du tort à quelqu'un en vraie détresse.",
    },
    general: {
        label: '🔮 Générale',
        rowLabel: '',
        accent: 'border-gray-100',
        help: "Notes sans connecteur, toujours disponibles. Seules 8 notes générales sont vues à la fois par Vanessa — pour du vocabulaire, utilise plutôt les Expressions. Catégorie « publicite » : mentionnée en fin de message.",
    },
    connector: {
        label: '🔌 Connecteurs',
        rowLabel: '',
        accent: 'border-gray-100',
        help: "Notes rattachées à un connecteur : Vanessa ne s'en sert que lorsque ce connecteur est actif dans la conversation. Catégorie « publicite » : mentionnée en fin de message quand ce connecteur est actif.",
    },
};

function Badge({ n }: { n: number }) {
    if (!n) return null;
    return (
        <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#FF4757] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {n}
        </span>
    );
}

export const VanessaKnowledgeManager = () => {
    // --- Compteurs "à activer" par type (une requête d'une ligne chacun) ---
    const [counts, setCounts] = useState<PendingCounts | null>(null);
    const [countsError, setCountsError] = useState<string | null>(null);

    // --- Sélection : rien n'est chargé tant qu'aucun type n'est choisi ---
    const [scope, setScope] = useState<KnowledgeScope | null>(null);
    const [connectorId, setConnectorId] = useState('');
    const [statusTab, setStatusTab] = useState<StatusTab>('pending');
    const [searchInput, setSearchInput] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    // --- Liste affichée ---
    const [items, setItems] = useState<VanessaKnowledge[]>([]);
    // null = pas encore chargé : aucun compteur n'est affiché (évite de montrer
    // les chiffres d'un autre type ou d'un autre onglet pendant le chargement).
    const [meta, setMeta] = useState<{ total: number; otherTotal: number } | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingList, setLoadingList] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const requestRef = useRef(0);

    // --- Ajout ---
    const [showAdd, setShowAdd] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);
    const [category, setCategory] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [resourceContent, setResourceContent] = useState('');
    // Formulaire structuré du lexique — 3 champs distincts plutôt qu'un
    // texte libre, pour garantir que chaque expression est vraiment
    // accompagnée de son usage et d'un exemple (ce qui aide réellement
    // Claude à savoir QUAND s'en servir, pas juste QU'ELLE existe).
    const [lexExpression, setLexExpression] = useState('');
    const [lexUsage, setLexUsage] = useState('');
    const [lexExample, setLexExample] = useState('');

    useEffect(() => {
        vanessaKnowledgeService
            .pendingCounts()
            .then(setCounts)
            .catch((e: any) => setCountsError(e.message || 'Impossible de charger les compteurs.'));
    }, []);

    // Chargement de la première page dès que le filtre change.
    useEffect(() => {
        if (!scope || (scope === 'connector' && !connectorId)) {
            setItems([]);
            setNextCursor(null);
            return;
        }
        const myRequest = ++requestRef.current;
        setLoadingList(true);
        setListError(null);
        setMeta(null);
        vanessaKnowledgeService
            .list({
                scope,
                connectorId: scope === 'connector' ? connectorId : undefined,
                active: statusTab === 'active',
                search: appliedSearch || undefined,
            })
            .then((r) => {
                if (myRequest !== requestRef.current) return; // réponse périmée
                setItems(r.documents);
                setMeta({ total: r.total, otherTotal: r.otherTotal });
                setNextCursor(r.nextCursor);
            })
            .catch((e: any) => {
                if (myRequest !== requestRef.current) return;
                setItems([]);
                setNextCursor(null);
                setListError(e.message || 'Impossible de charger les connaissances.');
            })
            .finally(() => {
                if (myRequest === requestRef.current) setLoadingList(false);
            });
    }, [scope, connectorId, statusTab, appliedSearch, reloadKey]);

    const loadMore = async () => {
        if (!scope || !nextCursor) return;
        setLoadingMore(true);
        try {
            const r = await vanessaKnowledgeService.list({
                scope,
                connectorId: scope === 'connector' ? connectorId : undefined,
                active: statusTab === 'active',
                search: appliedSearch || undefined,
                cursor: nextCursor,
            });
            setItems((prev) => {
                const seen = new Set(prev.map((i) => i.$id));
                return [...prev, ...r.documents.filter((d) => !seen.has(d.$id))];
            });
            setNextCursor(r.nextCursor);
        } catch (e: any) {
            setListError(e.message || 'Impossible de charger la suite.');
        } finally {
            setLoadingMore(false);
        }
    };

    const selectScope = (next: KnowledgeScope) => {
        setMeta(null);
        setScope(next);
        setConnectorId('');
        setStatusTab('pending');
        setSearchInput('');
        setAppliedSearch('');
        setShowAdd(false);
        setFlash(null);
    };

    const selectConnector = (id: string) => {
        setMeta(null);
        setConnectorId(id);
        setStatusTab('pending');
        setSearchInput('');
        setAppliedSearch('');
        setShowAdd(false);
        setFlash(null);
    };

    // Les compteurs "à activer" sont ajustés localement après chaque action,
    // sans rien relire côté serveur.
    const adjustPending = (delta: number) => {
        setCounts((prev) => {
            if (!prev || !scope) return prev;
            if (scope === 'connector') {
                return { ...prev, connectors: prev.connectors.map((c) => (c.$id === connectorId ? { ...c, pending: Math.max(0, c.pending + delta) } : c)) };
            }
            return { ...prev, [scope]: Math.max(0, prev[scope] + delta) };
        });
    };

    // Mise à jour directe de l'écran (jamais de rechargement de la liste) :
    // la note quitte l'onglet courant puisqu'elle change de statut. En cas
    // d'échec réel du serveur, tout est annulé.
    const toggleActive = async (item: VanessaKnowledge) => {
        const nowActive = !item.active;
        const prevItems = items;
        const prevMeta = meta;
        setItems((prev) => prev.filter((i) => i.$id !== item.$id));
        setMeta((m) => (m ? { total: Math.max(0, m.total - 1), otherTotal: m.otherTotal + 1 } : m));
        adjustPending(nowActive ? -1 : 1);
        try {
            await vanessaKnowledgeService.update(item.$id, { active: nowActive });
        } catch {
            setItems(prevItems);
            setMeta(prevMeta);
            adjustPending(nowActive ? 1 : -1);
        }
    };

    const remove = async (item: VanessaKnowledge) => {
        const prevItems = items;
        const prevMeta = meta;
        const prevCursor = nextCursor;
        setItems((prev) => prev.filter((i) => i.$id !== item.$id));
        setMeta((m) => (m ? { ...m, total: Math.max(0, m.total - 1) } : m));
        // Le curseur de pagination est l'identifiant de la dernière note
        // chargée : si on supprime justement celle-là, "Afficher plus"
        // échouerait (note introuvable). On le recale sur la note précédente.
        if (item.$id === nextCursor) {
            const index = prevItems.findIndex((i) => i.$id === item.$id);
            setNextCursor(index > 0 ? prevItems[index - 1].$id : null);
        }
        if (!item.active) adjustPending(-1);
        try {
            await vanessaKnowledgeService.remove(item.$id);
        } catch {
            setItems(prevItems);
            setMeta(prevMeta);
            setNextCursor(prevCursor);
            if (!item.active) adjustPending(1);
        }
    };

    // Une note ajoutée est créée ACTIVE : elle apparaît donc dans l'onglet
    // "Activées" — on y bascule pour qu'elle soit visible tout de suite.
    const afterAdd = () => {
        setStatusTab('active');
        setAppliedSearch('');
        setSearchInput('');
        setReloadKey((k) => k + 1);
        setFlash('Ajoutée — visible dans « Activées ».');
        setShowAdd(false);
    };

    const handleAddNote = async () => {
        if (!category.trim() || !content.trim() || !scope) return;
        setSaving(true);
        try {
            await vanessaKnowledgeService.create(category.trim(), content.trim(), scope === 'connector' ? connectorId : '');
            setCategory('');
            setContent('');
            afterAdd();
        } finally {
            setSaving(false);
        }
    };

    const handleAddResource = async () => {
        if (!resourceContent.trim()) return;
        setSaving(true);
        try {
            await vanessaKnowledgeService.create(URGENT_CATEGORY, resourceContent.trim());
            setResourceContent('');
            afterAdd();
        } finally {
            setSaving(false);
        }
    };

    const handleAddLexicon = async () => {
        if (!lexExpression.trim() || !lexUsage.trim()) return;
        setSaving(true);
        try {
            // Combine les 3 champs en un contenu bien formaté — structure
            // cohérente, lisible aussi bien par toi que par Claude.
            const formatted = `"${lexExpression.trim()}" : ${lexUsage.trim()}${lexExample.trim() ? ` — Exemple : "${lexExample.trim()}"` : ''}`;
            await vanessaKnowledgeService.create(LEXICON_CATEGORY, formatted);
            setLexExpression('');
            setLexUsage('');
            setLexExample('');
            afterAdd();
        } finally {
            setSaving(false);
        }
    };

    const connectorsPendingTotal = counts ? counts.connectors.reduce((sum, c) => sum + c.pending, 0) : 0;
    const pendingCount = meta ? (statusTab === 'pending' ? meta.total : meta.otherTotal) : null;
    const activeCount = meta ? (statusTab === 'active' ? meta.total : meta.otherTotal) : null;
    const selectedConnector = counts?.connectors.find((c) => c.$id === connectorId);
    const ready = !!scope && (scope !== 'connector' || !!connectorId);

    const typeChips: { id: KnowledgeScope; pending: number }[] = [
        { id: 'lexique', pending: counts?.lexique ?? 0 },
        { id: 'urgence', pending: counts?.urgence ?? 0 },
        { id: 'general', pending: counts?.general ?? 0 },
        { id: 'connector', pending: connectorsPendingTotal },
    ];

    return (
        <div className="bg-white rounded-3xl p-5 space-y-4">
            <div>
                <h2 className="text-base font-bold text-gray-800">Base de connaissances de Vanessa</h2>
                <p className="text-xs text-gray-400 mt-1">
                    Choisis un type : seules ses connaissances sont chargées. Le badge indique ce qui attend d'être activé.
                    Jamais de données privées d'utilisateurs ici.
                </p>
            </div>

            {/* 1. Le type */}
            <div className="flex flex-wrap gap-2">
                {typeChips.map(({ id, pending }) => (
                    <button
                        key={id}
                        onClick={() => selectScope(id)}
                        className={`inline-flex items-center rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                            scope === id ? 'bg-[#FF4757] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {SCOPE_META[id].label}
                        {pending > 0 && (
                            <span className={`ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                                scope === id ? 'bg-white/25 text-white' : 'bg-[#FF4757] text-white'
                            }`}>
                                {pending}
                            </span>
                        )}
                    </button>
                ))}
            </div>
            {countsError && <p className="text-xs text-amber-600">Compteurs indisponibles : {countsError}</p>}

            {/* 1 bis. Le connecteur, si on est dans "Connecteurs" */}
            {scope === 'connector' && (
                <select
                    value={connectorId}
                    onChange={(e) => selectConnector(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                >
                    <option value="">Choisis un connecteur…</option>
                    {(counts?.connectors ?? []).map((c) => (
                        <option key={c.$id} value={c.$id}>
                            {c.icon} {c.name}{c.pending ? ` — ${c.pending} à activer` : ''}{c.active ? '' : ' (désactivé)'}
                        </option>
                    ))}
                </select>
            )}

            {!scope && (
                <p className="text-sm text-gray-400 bg-gray-50 rounded-2xl p-5 text-center">
                    Choisis un type ci-dessus pour afficher ses connaissances.
                </p>
            )}
            {scope === 'connector' && !connectorId && (
                <p className="text-sm text-gray-400 bg-gray-50 rounded-2xl p-5 text-center">
                    Choisis un connecteur pour afficher ses connaissances.
                </p>
            )}

            {ready && scope && (
                <>
                    <p className="text-xs text-gray-500">{SCOPE_META[scope].help}</p>

                    {/* 2. Le statut — "À activer" par défaut */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setStatusTab('pending')}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${statusTab === 'pending' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            À activer{pendingCount !== null ? ` (${pendingCount})` : ''}
                        </button>
                        <button
                            onClick={() => setStatusTab('active')}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${statusTab === 'active' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            Activées{activeCount !== null ? ` (${activeCount})` : ''}
                        </button>
                        <button
                            onClick={() => { setShowAdd((v) => !v); setFlash(null); }}
                            className="ml-auto rounded-full bg-[#FF4757]/10 px-3.5 py-1.5 text-xs font-bold text-[#FF4757] hover:bg-[#FF4757]/20"
                        >
                            {showAdd ? 'Fermer' : '+ Ajouter'}
                        </button>
                    </div>

                    {/* Recherche dans ce type (nécessite un index fulltext sur `content`) */}
                    <form
                        onSubmit={(e) => { e.preventDefault(); setAppliedSearch(searchInput.trim()); }}
                        className="flex gap-2"
                    >
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Rechercher dans ces connaissances…"
                            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                        />
                        <Button size="sm" variant="secondary" type="submit">Rechercher</Button>
                        {appliedSearch && (
                            <Button size="sm" variant="ghost" type="button" onClick={() => { setSearchInput(''); setAppliedSearch(''); }}>
                                Effacer
                            </Button>
                        )}
                    </form>

                    {flash && <p className="text-xs font-semibold text-green-600">{flash}</p>}

                    {/* Ajout — le formulaire correspond au type choisi */}
                    {showAdd && scope === 'lexique' && (
                        <div className="flex flex-col gap-2 bg-indigo-50/50 rounded-2xl p-4">
                            <input
                                value={lexExpression}
                                onChange={(e) => setLexExpression(e.target.value)}
                                placeholder="Expression (ex: c'est chaud)"
                                maxLength={100}
                                className="rounded-xl border border-indigo-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                            />
                            <textarea
                                value={lexUsage}
                                onChange={(e) => setLexUsage(e.target.value)}
                                placeholder="Description / usage (dans quel contexte, avec quel sens)"
                                rows={2}
                                maxLength={300}
                                className="rounded-xl border border-indigo-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
                            />
                            <input
                                value={lexExample}
                                onChange={(e) => setLexExample(e.target.value)}
                                placeholder="Exemple de phrase complète (optionnel mais recommandé)"
                                maxLength={200}
                                className="rounded-xl border border-indigo-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                            />
                            <Button size="sm" onClick={handleAddLexicon} isLoading={saving} disabled={!lexExpression.trim() || !lexUsage.trim()}>
                                + Ajouter au lexique
                            </Button>
                        </div>
                    )}

                    {showAdd && scope === 'urgence' && (
                        <div className="flex flex-col gap-2 bg-rose-50/50 rounded-2xl p-4">
                            <textarea
                                value={resourceContent}
                                onChange={(e) => setResourceContent(e.target.value)}
                                placeholder="Ex: Pour une grossesse non désirée ou une question de santé sexuelle : Centre Jeune Amour & Vie le plus proche — [adresse/numéro vérifié]"
                                rows={2}
                                maxLength={2000}
                                className="rounded-xl border border-rose-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none bg-white"
                            />
                            <Button size="sm" onClick={handleAddResource} isLoading={saving} disabled={!resourceContent.trim()}>
                                + Ajouter une ressource vérifiée
                            </Button>
                        </div>
                    )}

                    {showAdd && (scope === 'general' || scope === 'connector') && (
                        <div className="flex flex-col gap-2 bg-gray-50 rounded-2xl p-4">
                            <p className="text-xs text-gray-500">
                                {scope === 'connector'
                                    ? `Sera rattachée au connecteur « ${selectedConnector?.name ?? ''} ».`
                                    : 'Note générale : aucun connecteur, toujours disponible.'}
                            </p>
                            <input
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Catégorie (ex: expressions, événements, règles, publicite)"
                                maxLength={50}
                                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                            />
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Contenu de la note..."
                                rows={2}
                                maxLength={2000}
                                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40 resize-none"
                            />
                            <Button size="sm" onClick={handleAddNote} isLoading={saving} disabled={!category.trim() || !content.trim()}>
                                + Ajouter
                            </Button>
                        </div>
                    )}

                    {/* 3. Les notes */}
                    {listError && <p className="text-sm text-red-500">{listError}</p>}

                    {loadingList ? (
                        <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                    ) : items.length === 0 && !nextCursor && !listError ? (
                        <div className="text-center py-8 space-y-2">
                            <p className="text-sm text-gray-400">
                                {appliedSearch
                                    ? 'Aucun résultat pour cette recherche.'
                                    : statusTab === 'pending'
                                        ? 'Rien à activer ici.'
                                        : 'Aucune connaissance activée ici.'}
                            </p>
                            {!appliedSearch && statusTab === 'pending' && !!meta && meta.otherTotal > 0 && (
                                <button onClick={() => setStatusTab('active')} className="text-xs font-semibold text-[#FF4757]">
                                    Voir les {meta.otherTotal} activée(s)
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {items.map((item) => (
                                <div
                                    key={item.$id}
                                    className={`rounded-xl p-3 border ${SCOPE_META[scope].accent}`}
                                >
                                    <div className="flex items-center justify-between mb-1 gap-2">
                                        <span className="text-xs font-semibold text-purple-600 truncate">
                                            {SCOPE_META[scope].rowLabel || item.category}
                                        </span>
                                        <div className="flex gap-3 shrink-0">
                                            <button
                                                onClick={() => toggleActive(item)}
                                                className={`text-xs font-semibold ${item.active ? 'text-gray-400 hover:text-gray-600' : 'text-green-600 hover:text-green-700'}`}
                                            >
                                                {item.active ? 'Désactiver' : 'Activer'}
                                            </button>
                                            <button onClick={() => remove(item)} className="text-xs text-red-400 hover:text-red-600">
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-line">{item.content}</p>
                                </div>
                            ))}

                            <div className="flex items-center justify-between pt-1">
                                <p className="text-[11px] text-gray-400">
                                    {items.length} affichée(s){meta ? ` sur ${meta.total}` : ''}
                                </p>
                                {nextCursor && (
                                    <Button size="sm" variant="secondary" onClick={loadMore} isLoading={loadingMore}>
                                        Afficher plus
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
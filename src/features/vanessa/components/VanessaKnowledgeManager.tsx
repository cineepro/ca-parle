// src/features/vanessa/components/VanessaKnowledgeManager.tsx — Ça Parle
import { useState, useEffect } from 'react';
import { vanessaKnowledgeService, type VanessaKnowledge, type VanessaConnector } from '../services/vanessaKnowledgeService';
import { Button } from '@/components/ui/button';

// Catégories techniques dédiées reconnues par la Function send-message :
// - URGENT_CATEGORY : toujours incluse, uniquement utilisée sur un sujet
//   grave.
// - LEXICON_CATEGORY : toujours incluse, c'est le vocabulaire/ton propre
//   de Vanessa (sa vraie particularité).
// Ne jamais renommer sans changer aussi les constantes équivalentes côté
// Function (URGENT_RESOURCES_CATEGORY / LEXICON_CATEGORY).
const URGENT_CATEGORY = 'ressources_urgence';
const LEXICON_CATEGORY = 'lexique';

export const VanessaKnowledgeManager = () => {
    const [items, setItems] = useState<VanessaKnowledge[]>([]);
    const [connectors, setConnectors] = useState<VanessaConnector[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('');
    const [content, setContent] = useState('');
    const [connectorId, setConnectorId] = useState('');
    const [saving, setSaving] = useState(false);

    const [resourceContent, setResourceContent] = useState('');
    const [savingResource, setSavingResource] = useState(false);

    // Formulaire structuré du lexique — 3 champs distincts plutôt qu'un
    // texte libre, pour garantir que chaque expression est vraiment
    // accompagnée de son usage et d'un exemple (ce qui aide réellement
    // Claude à savoir QUAND s'en servir, pas juste QU'ELLE existe).
    const [lexExpression, setLexExpression] = useState('');
    const [lexUsage, setLexUsage] = useState('');
    const [lexExample, setLexExample] = useState('');
    const [savingLexicon, setSavingLexicon] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [list, connectorList] = await Promise.all([
                vanessaKnowledgeService.list(),
                vanessaKnowledgeService.listConnectors(),
            ]);
            setItems(list);
            setConnectors(connectorList);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleAdd = async () => {
        if (!category.trim() || !content.trim()) return;
        setSaving(true);
        try {
            await vanessaKnowledgeService.create(category.trim(), content.trim(), connectorId);
            setCategory('');
            setContent('');
            setConnectorId('');
            await load();
        } finally {
            setSaving(false);
        }
    };

    const handleAddResource = async () => {
        if (!resourceContent.trim()) return;
        setSavingResource(true);
        try {
            await vanessaKnowledgeService.create(URGENT_CATEGORY, resourceContent.trim());
            setResourceContent('');
            await load();
        } finally {
            setSavingResource(false);
        }
    };

    const handleAddLexicon = async () => {
        if (!lexExpression.trim() || !lexUsage.trim()) return;
        setSavingLexicon(true);
        try {
            // Combine les 3 champs en un contenu bien formaté — structure
            // cohérente, lisible aussi bien par toi que par Claude.
            const formatted = `"${lexExpression.trim()}" : ${lexUsage.trim()}${lexExample.trim() ? ` — Exemple : "${lexExample.trim()}"` : ''}`;
            await vanessaKnowledgeService.create(LEXICON_CATEGORY, formatted);
            setLexExpression('');
            setLexUsage('');
            setLexExample('');
            await load();
        } finally {
            setSavingLexicon(false);
        }
    };

    const toggleActive = async (item: VanessaKnowledge) => {
        await vanessaKnowledgeService.update(item.$id, { active: !item.active });
        await load();
    };

    const remove = async (id: string) => {
        await vanessaKnowledgeService.remove(id);
        await load();
    };

    const resources = items.filter((i) => i.category === URGENT_CATEGORY);
    const lexicon = items.filter((i) => i.category === LEXICON_CATEGORY);
    const generalNotes = items.filter((i) => i.category !== URGENT_CATEGORY && i.category !== LEXICON_CATEGORY && !i.connectorId);
    const connectorNotes = (id: string) => items.filter((i) => i.connectorId === id);

    return (
        <div className="space-y-4">
            {/* 🗣️ Lexique — la particularité de Vanessa */}
            <div className="bg-white rounded-3xl p-6 space-y-4 border-2 border-indigo-100">
                <div>
                    <h2 className="text-base font-bold text-gray-800">🗣️ Lexique de Vanessa</h2>
                    <p className="text-xs text-gray-500 mt-1">
                        C'est ici que se construit ce qui fait sa différence : son français de rue et ses expressions.
                        Toujours entièrement inclus dans ses réponses, même quand un connecteur partenaire est actif —
                        elle reste sérieuse sur le fond, mais garde toujours ce ton.
                    </p>
                </div>

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
                    <Button size="sm" onClick={handleAddLexicon} isLoading={savingLexicon} disabled={!lexExpression.trim() || !lexUsage.trim()}>
                        + Ajouter au lexique
                    </Button>
                </div>

                {lexicon.length === 0 ? (
                    <p className="text-sm text-gray-400">Aucune expression pour l'instant.</p>
                ) : (
                    <div className="space-y-2">
                        {lexicon.map((item) => (
                            <div key={item.$id} className={`rounded-xl p-3 border ${item.active ? 'border-indigo-100 bg-indigo-50/30' : 'border-gray-100 opacity-50'}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-indigo-500">Expression</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleActive(item)} className="text-xs text-gray-400 hover:text-gray-600">
                                            {item.active ? 'Désactiver' : 'Activer'}
                                        </button>
                                        <button onClick={() => remove(item.$id)} className="text-xs text-red-400 hover:text-red-600">
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700">{item.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 🤍 Vanessa t'écoute — ressources d'urgence */}
            <div className="bg-white rounded-3xl p-6 space-y-4 border-2 border-rose-100">
                <h2 className="text-base font-bold text-gray-800">🤍 Vanessa t'écoute — ressources d'urgence</h2>
                <p className="text-xs text-gray-500">
                    Ces ressources sont utilisées UNIQUEMENT quand une conversation touche un sujet grave (violence,
                    détresse, grossesse non désirée...). Tant qu'aucune n'est ajoutée ici, Vanessa reste volontairement
                    générale plutôt que d'inventer un numéro ou une adresse.
                </p>
                <p className="text-xs font-semibold text-rose-500">
                    ⚠️ Vérifie personnellement l'exactitude de chaque information avant de l'ajouter — un numéro ou
                    une adresse erronée peut faire du tort à quelqu'un en vraie détresse.
                </p>

                <div className="flex flex-col gap-2 bg-rose-50/50 rounded-2xl p-4">
                    <textarea
                        value={resourceContent}
                        onChange={(e) => setResourceContent(e.target.value)}
                        placeholder="Ex: Pour une grossesse non désirée ou une question de santé sexuelle : Centre Jeune Amour & Vie le plus proche — [adresse/numéro vérifié]"
                        rows={2}
                        maxLength={2000}
                        className="rounded-xl border border-rose-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none bg-white"
                    />
                    <Button size="sm" onClick={handleAddResource} isLoading={savingResource} disabled={!resourceContent.trim()}>
                        + Ajouter une ressource vérifiée
                    </Button>
                </div>

                {resources.length === 0 ? (
                    <p className="text-sm text-gray-400">Aucune ressource renseignée pour l'instant.</p>
                ) : (
                    <div className="space-y-2">
                        {resources.map((item) => (
                            <div key={item.$id} className={`rounded-xl p-3 border ${item.active ? 'border-rose-100 bg-rose-50/30' : 'border-gray-100 opacity-50'}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-rose-500">Ressource vérifiée</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleActive(item)} className="text-xs text-gray-400 hover:text-gray-600">
                                            {item.active ? 'Désactiver' : 'Activer'}
                                        </button>
                                        <button onClick={() => remove(item.$id)} className="text-xs text-red-400 hover:text-red-600">
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700">{item.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Base de connaissances générale + par connecteur */}
            <div className="bg-white rounded-3xl p-6 space-y-4">
                <h2 className="text-base font-bold text-gray-800">🔮 Base de connaissances de Vanessa</h2>
                <p className="text-xs text-gray-400">
                    Notes ajoutées manuellement pour personnaliser ses réponses et ses publications. Jamais de données privées d'utilisateurs.
                    Catégorie <strong>publicite</strong> (rattachée à un connecteur) : Vanessa la mentionnera systématiquement en fin de message quand ce connecteur est actif.
                    Seules 8 notes générales sont vues à la fois — pour du vocabulaire, utilise plutôt le Lexique ci-dessus.
                </p>

                <div className="flex flex-col gap-2 bg-gray-50 rounded-2xl p-4">
                    <select
                        value={connectorId}
                        onChange={(e) => setConnectorId(e.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                    >
                        <option value="">🔮 Générale (aucun connecteur, toujours disponible)</option>
                        {connectors.map((c) => (
                            <option key={c.$id} value={c.$id}>{c.icon} {c.name}</option>
                        ))}
                    </select>
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
                    <Button size="sm" onClick={handleAdd} isLoading={saving} disabled={!category.trim() || !content.trim()}>
                        + Ajouter
                    </Button>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400">Chargement...</p>
                ) : (
                    <div className="space-y-5">
                        {/* Notes générales */}
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">🔮 Générale</p>
                            {generalNotes.length === 0 ? (
                                <p className="text-sm text-gray-400">Aucune note générale.</p>
                            ) : (
                                <div className="space-y-2">
                                    {generalNotes.map((item) => (
                                        <NoteRow key={item.$id} item={item} onToggle={toggleActive} onRemove={remove} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Une section par connecteur */}
                        {connectors.map((c) => {
                            const notes = connectorNotes(c.$id);
                            if (notes.length === 0) return null;
                            return (
                                <div key={c.$id}>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                        {c.icon} {c.name}
                                    </p>
                                    <div className="space-y-2">
                                        {notes.map((item) => (
                                            <NoteRow key={item.$id} item={item} onToggle={toggleActive} onRemove={remove} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

function NoteRow({ item, onToggle, onRemove }: { item: VanessaKnowledge; onToggle: (i: VanessaKnowledge) => void; onRemove: (id: string) => void }) {
    return (
        <div className={`rounded-xl p-3 border ${item.active ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-purple-600">{item.category}</span>
                <div className="flex gap-2">
                    <button onClick={() => onToggle(item)} className="text-xs text-gray-400 hover:text-gray-600">
                        {item.active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button onClick={() => onRemove(item.$id)} className="text-xs text-red-400 hover:text-red-600">
                        Supprimer
                    </button>
                </div>
            </div>
            <p className="text-sm text-gray-700">{item.content}</p>
        </div>
    );
}
// src/features/vanessa/components/VanessaKnowledgeManager.tsx — Ça Parle
import { useState, useEffect } from 'react';
import { vanessaKnowledgeService, type VanessaKnowledge } from '../services/vanessaKnowledgeService';
import { Button } from '@/components/ui/button';

export const VanessaKnowledgeManager = () => {
    const [items, setItems] = useState<VanessaKnowledge[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const list = await vanessaKnowledgeService.list();
            setItems(list);
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
            await vanessaKnowledgeService.create(category.trim(), content.trim());
            setCategory('');
            setContent('');
            await load();
        } finally {
            setSaving(false);
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

    return (
        <div className="bg-white rounded-3xl p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-800">🔮 Base de connaissances de Vanessa</h2>
            <p className="text-xs text-gray-400">
                Notes ajoutées manuellement pour personnaliser ses réponses et ses publications. Jamais de données privées d'utilisateurs.
            </p>

            <div className="flex flex-col gap-2 bg-gray-50 rounded-2xl p-4">
                <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Catégorie (ex: expressions, événements, règles)"
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
            ) : items.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune note pour l'instant.</p>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div key={item.$id} className={`rounded-xl p-3 border ${item.active ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-purple-600">{item.category}</span>
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
    );
};
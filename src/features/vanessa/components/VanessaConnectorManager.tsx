// src/features/vanessa/components/VanessaConnectorManager.tsx — Ça Parle
import { useState, useEffect } from 'react';
import { vanessaKnowledgeService, type VanessaConnector } from '../services/vanessaKnowledgeService';
import { Button } from '@/components/ui/button';

const EMPTY_FORM = { name: '', slug: '', icon: '🔗', color: '#FF4757', description: '' };

export const VanessaConnectorManager = () => {
    const [connectors, setConnectors] = useState<VanessaConnector[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            setConnectors(await vanessaKnowledgeService.listConnectors());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const slugify = (text: string) =>
        text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const handleAdd = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            await vanessaKnowledgeService.createConnector({
                name: form.name.trim(),
                slug: form.slug.trim() || slugify(form.name),
                icon: form.icon.trim() || '🔗',
                color: form.color,
                description: form.description.trim(),
                active: true,
            });
            setForm(EMPTY_FORM);
            await load();
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (c: VanessaConnector) => {
        await vanessaKnowledgeService.updateConnector(c.$id, { active: !c.active });
        await load();
    };

    const remove = async (id: string) => {
        await vanessaKnowledgeService.removeConnector(id);
        await load();
    };

    return (
        <div className="bg-white rounded-3xl p-6 space-y-4">
            <div>
                <h2 className="text-base font-bold text-gray-800">🔗 Connecteurs de partenaires</h2>
                <p className="text-xs text-gray-400 mt-1">
                    Chaque connecteur apparaît comme une pastille sélectionnable dans le chat avec Vanessa. Quand un
                    utilisateur en active un, elle ne cherche plus que dans les notes liées à ce connecteur (voir
                    l'onglet "Base de connaissances" pour lui rattacher des notes).
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-2xl p-4">
                <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nom (ex: Amour & Vie)"
                    maxLength={100}
                    className="col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                />
                <input
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="Icône (emoji)"
                    maxLength={10}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                />
                <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="rounded-xl border border-gray-200 h-10 w-full cursor-pointer"
                />
                <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Description courte (ex: En partenariat avec ABMS)"
                    maxLength={200}
                    className="col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                />
                <Button size="sm" onClick={handleAdd} isLoading={saving} disabled={!form.name.trim()} className="col-span-2">
                    + Créer le connecteur
                </Button>
            </div>

            {loading ? (
                <p className="text-sm text-gray-400">Chargement...</p>
            ) : connectors.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun connecteur pour l'instant.</p>
            ) : (
                <div className="space-y-2">
                    {connectors.map((c) => (
                        <div key={c.$id} className={`flex items-center gap-3 rounded-xl p-3 border ${c.active ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
                            <span
                                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                style={{ backgroundColor: c.color }}
                            >
                                {c.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                                <p className="text-xs text-gray-400 truncate">{c.description || c.slug}</p>
                            </div>
                            <button onClick={() => toggleActive(c)} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">
                                {c.active ? 'Désactiver' : 'Activer'}
                            </button>
                            <button onClick={() => remove(c.$id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">
                                Supprimer
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
// src/features/vanessa/components/VanessaConnectorManager.tsx — Ça Parle
import { useState, useEffect, useRef } from 'react';
import { vanessaKnowledgeService, type VanessaConnector } from '../services/vanessaKnowledgeService';
import { Button } from '@/components/ui/button';

const EMPTY_FORM = { name: '', slug: '', icon: '🔗', color: '#FF4757', description: '', sourceUrl: '' };

function formatDate(iso?: string) {
    if (!iso) return null;
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const MONTH_LABELS = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

// "AAAA-MM" du mois en cours, ex. "2026-09" — même format que celui écrit
// côté backend (send-message) pour le compteur.
function currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 1 → "1" · 100 → "100" · 1000 → "1K" · 1500 → "1.5K"
function formatQuestionCount(n: number): string {
    if (n < 1000) return String(n);
    const thousands = n / 1000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
}

// Le compteur stocké peut appartenir à un mois déjà terminé (il n'est remis
// à zéro qu'à la PROCHAINE question posée, pas par une tâche planifiée) —
// on ne l'affiche donc que s'il correspond bien au mois en cours, sinon on
// affiche 0 : le mois vient de commencer, aucune question n'y a encore été
// posée.
function monthlyQuestionCount(c: VanessaConnector): number {
    if (c.questionCountMonth !== currentMonthKey()) return 0;
    return c.questionCount || 0;
}

export const VanessaConnectorManager = () => {
    const [connectors, setConnectors] = useState<VanessaConnector[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const [uploadMessage, setUploadMessage] = useState<Record<string, string>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
                sourceUrl: form.sourceUrl.trim(),
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

    const handlePdfPick = async (connectorId: string, file: File | undefined) => {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setUploadMessage((m) => ({ ...m, [connectorId]: '❌ Seuls les PDF sont acceptés.' }));
            return;
        }
        setUploadingFor(connectorId);
        setUploadMessage((m) => ({ ...m, [connectorId]: '' }));
        try {
            await vanessaKnowledgeService.ingestPdf(connectorId, file);
            setUploadMessage((m) => ({ ...m, [connectorId]: '✅ Lu et proposé en attente — à valider dans "Base de connaissances".' }));
        } catch (err: any) {
            setUploadMessage((m) => ({ ...m, [connectorId]: `❌ ${err.message || 'Échec de la lecture du PDF.'}` }));
        } finally {
            setUploadingFor(null);
        }
    };

    return (
        <div className="bg-white rounded-3xl p-6 space-y-4">
            <div>
                <h2 className="text-base font-bold text-gray-800">🔗 Connecteurs de partenaires</h2>
                <p className="text-xs text-gray-400 mt-1">
                    Chaque connecteur apparaît comme une pastille sélectionnable dans le chat avec Vanessa. Renseigne
                    un lien (site ou flux RSS) pour que sa base de connaissances s'enrichisse automatiquement — chaque
                    nouvelle note arrive désactivée, à valider dans l'onglet "Base de connaissances" avant que Vanessa
                    puisse s'en servir. Tu peux aussi lui ajouter des PDF directement ci-dessous.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Le badge à côté du nom indique le nombre de questions posées à ce connecteur depuis le début du
                    mois de {MONTH_LABELS[new Date().getMonth()]} (remis à zéro au 1ᵉʳ de chaque mois) — un indicateur
                    concret à montrer aux partenaires et institutions sur l'engagement réel des utilisateurs.
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
                <input
                    value={form.sourceUrl}
                    onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                    placeholder="Lien à surveiller (site ou flux RSS, optionnel)"
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
                        <div key={c.$id} className={`rounded-xl p-3 border ${c.active ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
                            <div className="flex items-center gap-3">
                                <span
                                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                    style={{ backgroundColor: c.color }}
                                >
                                    {c.icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                        {c.name}
                                        <span
                                            title={`${monthlyQuestionCount(c)} question(s) posée(s) en ${MONTH_LABELS[new Date().getMonth()]} — compteur remis à zéro chaque mois`}
                                            className="inline-flex items-center align-super text-[10px] leading-none font-bold text-white bg-[#FF4757] rounded-full px-1.5 py-0.5"
                                        >
                                            {formatQuestionCount(monthlyQuestionCount(c))}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">{c.description || c.slug}</p>
                                </div>
                                <button onClick={() => toggleActive(c)} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">
                                    {c.active ? 'Désactiver' : 'Activer'}
                                </button>
                                <button onClick={() => remove(c.$id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">
                                    Supprimer
                                </button>
                            </div>

                            <div className="mt-2 pl-11 space-y-1.5">
                                {c.sourceUrl && (
                                    <p className="text-xs text-gray-400">
                                        🔄 Lien surveillé : <span className="text-gray-600">{c.sourceUrl}</span>
                                        {c.lastSyncedAt && ` — dernière vérification : ${formatDate(c.lastSyncedAt)}`}
                                    </p>
                                )}

                                <div className="flex items-center gap-2">
                                    <input
                                        ref={(el) => { fileInputRefs.current[c.$id] = el; }}
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={(e) => handlePdfPick(c.$id, e.target.files?.[0])}
                                    />
                                    <button
                                        onClick={() => fileInputRefs.current[c.$id]?.click()}
                                        disabled={uploadingFor === c.$id}
                                        className="text-xs font-semibold text-[#FF4757] bg-[#FF4757]/5 hover:bg-[#FF4757]/10 rounded-full px-3 py-1 disabled:opacity-50"
                                    >
                                        {uploadingFor === c.$id ? 'Lecture en cours...' : '📄 Ajouter un PDF'}
                                    </button>
                                </div>
                                {uploadMessage[c.$id] && (
                                    <p className="text-xs text-gray-500">{uploadMessage[c.$id]}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
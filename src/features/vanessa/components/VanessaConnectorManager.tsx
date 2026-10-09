// src/features/vanessa/components/VanessaConnectorManager.tsx — Vanessa
import { useState, useEffect, useRef } from 'react';
import { vanessaKnowledgeService, type VanessaConnector, type ConnectorSource, type ConnectorModel } from '../services/vanessaKnowledgeService';
import { Button } from '@/components/ui/button';
import { monthlyQuestionCount, formatQuestionCount, MONTH_LABELS } from '../utils/questionCount';
import { AlertTriangle } from 'lucide-react';

const SELL_PRICE_PER_MILLION_TOKENS_FCFA = 5100; // même taux que côté serveur — voir Vanessa-API-Grille-Tarifaire.docx

function fcfaToTokens(fcfa: number): number {
    return Math.round((fcfa / SELL_PRICE_PER_MILLION_TOKENS_FCFA) * 1_000_000);
}

const EMPTY_FORM = { name: '', slug: '', icon: '🔗', color: '#F5C032', description: '', instructions: '', model: '' as ConnectorModel };
const MAX_INSTRUCTIONS = 4000;
// Connecteur « Mon cahier » : créé automatiquement, toujours en tête (voir manage-vanessa-knowledge).
const NOTEBOOK_CONNECTOR_ID = 'mon-cahier';

// Trame à remplir : plus court et plus clair qu'un texte libre, et ça évite que
// Vanessa reçoive des consignes contradictoires ou trop vagues.
const INSTRUCTIONS_TEMPLATE = `RÔLE : (qui tu es pour ce partenaire — ex : conseillère d'orientation des étudiants de l'UAC)

TU PEUX :
- (ce que tu sais faire ici, une ligne par capacité)

TU NE FAIS PAS :
- (ce qui est hors cadre — ex : promettre une admission, donner un avis médical)

AVANT DE RÉPONDRE, DEMANDE (une ou deux questions à la fois) :
- (infos à connaître sur la personne — ex : sa série du bac, sa moyenne, la ville)

FORMAT DES RÉPONSES :
- (ex : 2 à 3 pistes classées, avec une phrase de raison chacune)`;

const MODEL_OPTIONS: { value: ConnectorModel; label: string }[] = [
    { value: '', label: 'Par défaut (réglage du serveur)' },
    { value: 'sonnet', label: 'Sonnet — plus fin, plus cher' },
    { value: 'haiku', label: 'Haiku — plus économique' },
];
const EMPTY_SOURCE_FORM = { url: '', label: '', listingSelector: '' };

function formatDate(iso?: string) {
    if (!iso) return null;
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// tokensGranted à 0 = jamais facturé, considéré illimité (voir backend).
function usagePercent(c: VanessaConnector): number | null {
    if (!c.tokensGranted) return null;
    return Math.min(100, Math.round(((c.tokensUsed || 0) / c.tokensGranted) * 100));
}

// --- Panneau des sites surveillés par un connecteur (un connecteur peut
// en avoir plusieurs — ex: "Gouvernance" = gouv.bj + assemblee-nationale.bj
// + presidence.bj) — repliable, chargé seulement à l'ouverture. ---
function ConnectorSourcesPanel({ connectorId }: { connectorId: string }) {
    const [sources, setSources] = useState<ConnectorSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSource, setNewSource] = useState(EMPTY_SOURCE_FORM);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState(EMPTY_SOURCE_FORM);
    const [savingEdit, setSavingEdit] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            setSources(await vanessaKnowledgeService.listSources(connectorId));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [connectorId]);

    const handleAddSource = async () => {
        if (!newSource.url.trim()) return;
        setAdding(true);
        try {
            await vanessaKnowledgeService.addSource(connectorId, newSource.url.trim(), newSource.listingSelector.trim(), newSource.label.trim());
            setNewSource(EMPTY_SOURCE_FORM);
            await load();
        } finally {
            setAdding(false);
        }
    };

    const startEditSource = (s: ConnectorSource) => {
        setEditingId(s.$id);
        setEditValues({ url: s.url, label: s.label || '', listingSelector: s.listingSelector || '' });
    };

    const saveEditSource = async (sourceId: string) => {
        setSavingEdit(true);
        try {
            await vanessaKnowledgeService.updateSource(sourceId, {
                url: editValues.url.trim(), label: editValues.label.trim(), listingSelector: editValues.listingSelector.trim(),
            });
            setEditingId(null);
            await load();
        } finally {
            setSavingEdit(false);
        }
    };

    const removeSource = async (sourceId: string) => {
        await vanessaKnowledgeService.removeSource(sourceId);
        await load();
    };

    return (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500">
                Sites surveillés — toutes leurs notes se rattachent à ce même connecteur.
            </p>

            {loading ? (
                <p className="text-xs text-gray-400">Chargement...</p>
            ) : sources.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun site pour l'instant.</p>
            ) : (
                <div className="space-y-1.5">
                    {sources.map((s) => (
                        editingId === s.$id ? (
                            <div key={s.$id} className="bg-white rounded-lg p-2 space-y-1.5 border border-gray-200">
                                <input
                                    value={editValues.label}
                                    onChange={(e) => setEditValues((v) => ({ ...v, label: e.target.value }))}
                                    placeholder="Nom du site (ex: Assemblée nationale)"
                                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                                />
                                <input
                                    value={editValues.url}
                                    onChange={(e) => setEditValues((v) => ({ ...v, url: e.target.value }))}
                                    placeholder="Lien à surveiller"
                                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                                />
                                <input
                                    value={editValues.listingSelector}
                                    onChange={(e) => setEditValues((v) => ({ ...v, listingSelector: e.target.value }))}
                                    placeholder="Sélecteur CSS si page de liste sans RSS — sinon laisser vide"
                                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand"
                                />
                                <div className="flex gap-1.5">
                                    <Button size="sm" onClick={() => saveEditSource(s.$id)} isLoading={savingEdit}>Enregistrer</Button>
                                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Annuler</Button>
                                </div>
                            </div>
                        ) : (
                            <div key={s.$id} className="bg-white rounded-lg px-2.5 py-2 border border-gray-100">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 truncate">{s.label || s.url}</p>
                                        {s.label && <p className="text-xs text-gray-400 truncate">{s.url}</p>}
                                        {s.listingSelector && (
                                            <p className="text-xs text-gray-400 font-mono truncate">Sélecteur : {s.listingSelector}</p>
                                        )}
                                        <p className="text-xs text-gray-300">
                                            {s.lastSyncedAt ? `Dernière vérification : ${formatDate(s.lastSyncedAt)}` : 'Jamais encore vérifié'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => startEditSource(s)} className="text-xs font-semibold text-gray-400 hover:text-gray-600">Modifier</button>
                                        <button onClick={() => removeSource(s.$id)} className="text-xs font-semibold text-red-400 hover:text-red-600">Retirer</button>
                                    </div>
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}

            <div className="bg-white rounded-lg p-2 space-y-1.5 border border-dashed border-gray-200">
                <input
                    value={newSource.label}
                    onChange={(e) => setNewSource((v) => ({ ...v, label: e.target.value }))}
                    placeholder="Nom du site (optionnel, ex: Présidence)"
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <input
                    value={newSource.url}
                    onChange={(e) => setNewSource((v) => ({ ...v, url: e.target.value }))}
                    placeholder="Lien à surveiller (site ou flux RSS)"
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <input
                    value={newSource.listingSelector}
                    onChange={(e) => setNewSource((v) => ({ ...v, listingSelector: e.target.value }))}
                    placeholder="Sélecteur CSS si page de liste sans RSS (ex: a[href*=&quot;/article/&quot;]) — sinon laisser vide"
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <Button size="sm" onClick={handleAddSource} isLoading={adding} disabled={!newSource.url.trim()} className="w-full">
                    + Ajouter ce site
                </Button>
            </div>
        </div>
    );
}

// --- Instructions + modèle d'un connecteur : texte modifiable à tout moment. Les
// changements s'appliquent dès la prochaine question posée à ce connecteur. ---
function ConnectorInstructionsPanel({ connector, onSaved }: { connector: VanessaConnector; onSaved: (c: VanessaConnector, patch: Partial<VanessaConnector>) => void }) {
    const [text, setText] = useState(connector.instructions || '');
    const [model, setModel] = useState<ConnectorModel>(connector.model || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const dirty = text !== (connector.instructions || '') || model !== (connector.model || '');

    const save = async () => {
        setSaving(true);
        setMessage('');
        try {
            const patch = { instructions: text.trim(), model };
            await vanessaKnowledgeService.updateConnector(connector.$id, patch);
            onSaved(connector, patch);
            setText(patch.instructions);
            setMessage('✅ Enregistré — appliqué dès la prochaine question.');
        } catch (err: any) {
            setMessage(`❌ ${err.message || 'Échec de l\'enregistrement.'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500">
                Instructions pour Vanessa dans ce connecteur — son rôle, ce qu'elle peut faire ou non, les questions
                à poser. Elles ne s'appliquent qu'ici, et ne remplacent jamais ses règles de sécurité.
            </p>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_INSTRUCTIONS))}
                rows={12}
                placeholder="Laisse vide pour garder le comportement actuel (réponses à partir des notes du connecteur)."
                className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => setText((t) => (t.trim() ? t : INSTRUCTIONS_TEMPLATE))}
                    disabled={!!text.trim()}
                    className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 rounded-full px-3 py-1 disabled:opacity-40"
                    title={text.trim() ? 'Vide d\'abord le texte pour insérer la trame' : 'Insérer une trame à remplir'}
                >
                    Insérer la trame à remplir
                </button>
                <span className="text-xs text-gray-400">{text.length} / {MAX_INSTRUCTIONS}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs text-gray-500">Modèle :</label>
                <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as ConnectorModel)}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                    {MODEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <Button size="sm" onClick={save} isLoading={saving} disabled={!dirty}>Enregistrer</Button>
                {message && <p className="text-xs text-gray-500">{message}</p>}
            </div>
        </div>
    );
}

export const VanessaConnectorManager = () => {
    const [connectors, setConnectors] = useState<VanessaConnector[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const [uploadMessage, setUploadMessage] = useState<Record<string, string>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Édition du compte partenaire, connecteur par connecteur.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPartner, setEditPartner] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    // Zone "Sites" dépliée, un connecteur à la fois.
    const [sourcesOpenId, setSourcesOpenId] = useState<string | null>(null);

    // Zone "Instructions" dépliée, un connecteur à la fois.
    const [instructionsOpenId, setInstructionsOpenId] = useState<string | null>(null);

    // Recharge de tokens, connecteur par connecteur.
    const [rechargingId, setRechargingId] = useState<string | null>(null);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [savingRecharge, setSavingRecharge] = useState(false);
    const [rechargeConfirmation, setRechargeConfirmation] = useState<Record<string, string>>({});

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
                instructions: form.instructions.trim(),
                model: form.model,
                active: true,
            });
            setForm(EMPTY_FORM);
            await load();
        } finally {
            setSaving(false);
        }
    };

    // Même principe que pour les notes de connaissance : mise à jour
    // directe de l'écran plutôt qu'un rechargement complet de la liste,
    // qui donnait l'impression que toute la page se rechargeait pour un
    // simple interrupteur. Annulé visuellement si le serveur échoue vraiment.
    const toggleActive = async (c: VanessaConnector) => {
        const next = !c.active;
        setConnectors((prev) => prev.map((x) => (x.$id === c.$id ? { ...x, active: next } : x)));
        try {
            await vanessaKnowledgeService.updateConnector(c.$id, { active: next });
        } catch {
            setConnectors((prev) => prev.map((x) => (x.$id === c.$id ? { ...x, active: !next } : x)));
        }
    };

    const remove = async (id: string) => {
        const previous = connectors;
        setConnectors((prev) => prev.filter((c) => c.$id !== id));
        try {
            await vanessaKnowledgeService.removeConnector(id);
        } catch {
            setConnectors(previous);
        }
    };

    const startEdit = (c: VanessaConnector) => {
        setEditingId(c.$id);
        setEditPartner(c.partnerUserId || '');
    };

    const saveEdit = async (id: string) => {
        setSavingEdit(true);
        try {
            await vanessaKnowledgeService.updateConnector(id, { partnerUserId: editPartner.trim() });
            setEditingId(null);
            await load();
        } finally {
            setSavingEdit(false);
        }
    };

    const saveRecharge = async (id: string) => {
        const fcfa = parseInt(rechargeAmount, 10);
        if (!fcfa || fcfa <= 0) return;
        setSavingRecharge(true);
        try {
            const result = await vanessaKnowledgeService.rechargeConnectorTokens(id, fcfa);
            setRechargeConfirmation((m) => ({ ...m, [id]: `✅ ${fcfa.toLocaleString('fr-FR')} FCFA → ${result.tokensAdded.toLocaleString('fr-FR')} tokens ajoutés.` }));
            setRechargingId(null);
            setRechargeAmount('');
            await load();
        } finally {
            setSavingRecharge(false);
        }
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
                <h2 className="text-base font-bold text-gray-800">Connecteurs de partenaires</h2>
                <p className="text-xs text-gray-400 mt-1">
                    Chaque connecteur apparaît comme une pastille sélectionnable dans le chat avec Vanessa. Un
                    connecteur peut surveiller plusieurs sites à la fois (section "Sites" ci-dessous, une fois le
                    connecteur créé) — toutes leurs notes se retrouvent rattachées à la même pastille. Un connecteur
                    désactivé disparaît des pastilles sans que rien ne soit perdu : ses connaissances restent
                    intactes, prêtes à revenir dès qu'il est réactivé.
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
                    placeholder="Nom (ex: Gouvernance)"
                    maxLength={100}
                    className="col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <input
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="Icône (emoji)"
                    maxLength={10}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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
                    className="col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <textarea
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value.slice(0, MAX_INSTRUCTIONS) })}
                    rows={form.instructions ? 8 : 3}
                    placeholder="Instructions pour Vanessa (optionnel, modifiables ensuite) : son rôle dans ce connecteur, ce qu'elle peut faire, les questions à poser..."
                    className="col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, instructions: f.instructions.trim() ? f.instructions : INSTRUCTIONS_TEMPLATE }))}
                    disabled={!!form.instructions.trim()}
                    className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl px-3 py-2 disabled:opacity-40"
                >
                    Insérer la trame à remplir
                </button>
                <select
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value as ConnectorModel })}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                    aria-label="Modèle de réponse"
                >
                    {MODEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <Button size="sm" onClick={handleAdd} isLoading={saving} disabled={!form.name.trim()} className="col-span-2">
                    + Créer le connecteur
                </Button>
                <p className="col-span-2 text-xs text-gray-400">
                    Les sites à surveiller s'ajoutent juste après, dans la fiche du connecteur créé (section "Sites").
                </p>
            </div>

            {loading ? (
                <p className="text-sm text-gray-400">Chargement...</p>
            ) : connectors.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun connecteur pour l'instant.</p>
            ) : (
                <div className="space-y-2">
                    {connectors.map((c) => {
                        const percent = usagePercent(c);
                        const warning = percent !== null && percent >= 90;
                        const critical = percent !== null && percent >= 95;
                        const exhausted = percent !== null && percent >= 100;

                        return (
                            <div key={c.$id} className={`rounded-xl p-3 border ${c.active ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
                                <div className="flex items-center gap-3">
                                    <span
                                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                        style={{ backgroundColor: c.color }}
                                    >
                                        {c.icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 flex-wrap">
                                            {c.name}
                                            <span
                                                title={`${monthlyQuestionCount(c)} question(s) posée(s) en ${MONTH_LABELS[new Date().getMonth()]} — compteur remis à zéro chaque mois`}
                                                className="inline-flex items-center align-super text-xs leading-none font-bold text-ink bg-brand rounded-full px-1.5 py-0.5"
                                            >
                                                {formatQuestionCount(monthlyQuestionCount(c))}
                                            </span>
                                            {exhausted && (
                                                <span className="text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5">
                                                    QUOTA ÉPUISÉ
                                                </span>
                                            )}
                                            {!exhausted && critical && (
                                                <span className="text-xs font-bold text-white bg-red-400 rounded-full px-1.5 py-0.5">
                                                    <AlertTriangle className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> 95% consommé
                                                </span>
                                            )}
                                            {!exhausted && !critical && warning && (
                                                <span className="text-xs font-bold text-ink bg-amber-300 rounded-full px-1.5 py-0.5">
                                                    <AlertTriangle className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1.5 shrink-0" aria-hidden="true" /> 90% consommé
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {c.description || c.slug}
                                            {c.instructions ? ' · instructions ✓' : ''}
                                            {c.model ? ` · ${c.model === 'haiku' ? 'Haiku' : 'Sonnet'}` : ''}
                                        </p>
                                    </div>
                                    <button onClick={() => toggleActive(c)} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">
                                        {c.active ? 'Désactiver' : 'Activer'}
                                    </button>
                                    {c.$id === NOTEBOOK_CONNECTOR_ID ? (
                                        <span className="text-xs text-gray-300 shrink-0" title="Connecteur par défaut : on peut le désactiver, pas le supprimer">Par défaut</span>
                                    ) : (
                                        <button onClick={() => remove(c.$id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">
                                            Supprimer
                                        </button>
                                    )}
                                </div>

                                {/* Jauge de consommation — seulement si ce connecteur est facturé
                                    (tokensGranted > 0). Absente = illimité, rien à afficher. */}
                                {percent !== null && (
                                    <div className="mt-2 pl-11">
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${critical ? 'bg-red-500' : warning ? 'bg-amber-400' : 'bg-brand'}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {(c.tokensUsed || 0).toLocaleString('fr-FR')} / {(c.tokensGranted || 0).toLocaleString('fr-FR')} tokens ({percent}%)
                                        </p>
                                    </div>
                                )}

                                <div className="mt-2 pl-11 space-y-1.5">
                                    {c.partnerUserId && editingId !== c.$id && (
                                        <p className="text-xs text-gray-400">
                                            Compte partenaire relié : <span className="text-gray-600 font-mono">{c.partnerUserId}</span>
                                        </p>
                                    )}

                                    {editingId === c.$id ? (
                                        <div className="space-y-1.5 bg-gray-50 rounded-xl p-2.5">
                                            <input
                                                value={editPartner}
                                                onChange={(e) => setEditPartner(e.target.value)}
                                                placeholder="ID du compte partenaire (optionnel — pour l'espace partenaire)"
                                                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand"
                                            />
                                            <div className="flex gap-1.5">
                                                <Button size="sm" onClick={() => saveEdit(c.$id)} isLoading={savingEdit}>Enregistrer</Button>
                                                <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Annuler</Button>
                                            </div>
                                        </div>
                                    ) : rechargingId === c.$id ? (
                                        <div className="bg-gray-50 rounded-xl p-2.5 space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={rechargeAmount}
                                                    onChange={(e) => setRechargeAmount(e.target.value)}
                                                    placeholder="Montant reçu (FCFA)"
                                                    className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                                                />
                                                <Button size="sm" onClick={() => saveRecharge(c.$id)} isLoading={savingRecharge}>Ajouter</Button>
                                                <Button size="sm" variant="secondary" onClick={() => setRechargingId(null)}>Annuler</Button>
                                            </div>
                                            {!!parseInt(rechargeAmount, 10) && (
                                                <p className="text-xs text-gray-400">
                                                    ≈ {fcfaToTokens(parseInt(rechargeAmount, 10)).toLocaleString('fr-FR')} tokens à ce tarif (x3)
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-wrap">
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
                                                className="text-xs font-semibold text-ochre bg-brand-tint hover:bg-brand-strong rounded-full px-3 py-1 disabled:opacity-50"
                                            >
                                                {uploadingFor === c.$id ? 'Lecture en cours...' : 'Ajouter un PDF'}
                                            </button>
                                            <button
                                                onClick={() => setInstructionsOpenId(instructionsOpenId === c.$id ? null : c.$id)}
                                                className="text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1"
                                            >
                                                {instructionsOpenId === c.$id ? 'Masquer les instructions' : 'Instructions'}
                                            </button>
                                            <button
                                                onClick={() => setSourcesOpenId(sourcesOpenId === c.$id ? null : c.$id)}
                                                className="text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1"
                                            >
                                                {sourcesOpenId === c.$id ? 'Masquer les sites' : 'Sites'}
                                            </button>
                                            <button
                                                onClick={() => startEdit(c)}
                                                className="text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1"
                                            >
                                                Partenaire
                                            </button>
                                            <button
                                                onClick={() => setRechargingId(c.$id)}
                                                className="text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 rounded-full px-3 py-1"
                                            >
                                                Recharger des tokens
                                            </button>
                                        </div>
                                    )}
                                    {uploadMessage[c.$id] && (
                                        <p className="text-xs text-gray-500">{uploadMessage[c.$id]}</p>
                                    )}
                                    {rechargeConfirmation[c.$id] && (
                                        <p className="text-xs text-green-600">{rechargeConfirmation[c.$id]}</p>
                                    )}
                                    {sourcesOpenId === c.$id && <ConnectorSourcesPanel connectorId={c.$id} />}
                                    {instructionsOpenId === c.$id && (
                                        <ConnectorInstructionsPanel
                                            connector={c}
                                            onSaved={(conn, patch) => setConnectors((prev) => prev.map((x) => (x.$id === conn.$id ? { ...x, ...patch } : x)))}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
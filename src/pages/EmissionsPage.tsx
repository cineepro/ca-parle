// src/pages/EmissionsPage.tsx — Vanessa
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { emissionService, type Emission } from '@/features/vanessa/services/emissionService';
import { exportEmissionTranscript, type ExportFormat } from '@/features/vanessa/utils/exportTranscript';
import { VANESSA_USER_ID } from '@/api/constants';

const POSTURE_PRESETS = [
    { label: 'Débat', value: 'Débat — cherche à confronter, challenger, pousser l\u2019invité dans ses retranchements, défendre un point de vue clair.' },
    { label: 'Discussion émotionnelle', value: 'Discussion émotionnelle — cherche à faire émerger ce qui se cache sous la surface, creuse le ressenti réel, sans jamais forcer.' },
    { label: 'Libre', value: '' },
];

const STATUS_COLORS: Record<Emission['status'], string> = {
    'préparé': 'bg-gray-100 text-gray-500',
    'enregistré': 'bg-amber-50 text-amber-600',
    'publié': 'bg-green-50 text-green-600',
};

export default function EmissionsPage() {
    const navigate = useNavigate();
    const [emissions, setEmissions] = useState<Emission[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [title, setTitle] = useState('');
    const [guestName, setGuestName] = useState('');
    const [topic, setTopic] = useState('');
    const [postureChoice, setPostureChoice] = useState(POSTURE_PRESETS[0].value);
    const [customPosture, setCustomPosture] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Téléchargement de la discussion d'une émission déjà enregistrée (PDF ou Word).
    const [exportingKey, setExportingKey] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            setEmissions(await emissionService.list());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !topic.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const posture = customPosture.trim() || postureChoice;
            const { conversation } = await emissionService.create({
                title: title.trim(),
                guestName: guestName.trim(),
                topic: topic.trim(),
                posture,
            });
            navigate(`/emissions/${conversation.$id}/enregistrement`);
        } catch (err: any) {
            setError(err.message || "Impossible de créer l'émission.");
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async (emission: Emission, format: ExportFormat) => {
        if (exportingKey) return;
        setExportingKey(`${emission.$id}:${format}`);
        setExportError(null);
        try {
            await exportEmissionTranscript({
                format,
                meta: { title: emission.title, guestName: emission.guestName, topic: emission.topic, posture: emission.posture, date: emission.createdAt },
                vanessaId: VANESSA_USER_ID,
                conversationId: emission.conversationId,
            });
        } catch (err: any) {
            setExportError(err?.message || 'Impossible de préparer le fichier.');
        } finally {
            setExportingKey(null);
        }
    };

    const handleStatusChange = async (emission: Emission, status: Emission['status']) => {
        await emissionService.updateStatus(emission.$id, status);
        setEmissions((prev) => prev.map((e) => (e.$id === emission.$id ? { ...e, status } : e)));
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link to="/accueil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-xl font-bold text-gray-800">Émissions</h1>
                </div>
                <p className="text-sm text-gray-400 -mt-2">
                    Espace réservé à l'équipe — chaque émission ouvre une conversation dédiée avec Vanessa, en mode
                    libre (sujet et posture donnés à l'avance, sans restriction à sa base de connaissances).
                </p>

                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full bg-brand hover:bg-brand-hover text-ink font-semibold text-sm py-3 rounded-2xl transition-colors"
                    >
                        + Nouvelle émission
                    </button>
                )}

                {showForm && (
                    <form onSubmit={handleCreate} className="bg-white rounded-3xl p-6 space-y-3">
                        <h2 className="text-base font-bold text-gray-800">Nouvelle émission</h2>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Titre de l'épisode"
                            maxLength={150}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                        <input
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Nom de l'invité (optionnel)"
                            maxLength={100}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Sujet de la discussion — décris-le comme tu le donnerais à un vrai animateur"
                            rows={3}
                            maxLength={500}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                        />

                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1.5">Posture de discussion</p>
                            <div className="flex gap-2 flex-wrap mb-2">
                                {POSTURE_PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => { setPostureChoice(preset.value); setCustomPosture(''); }}
                                        className={`text-xs font-semibold rounded-full px-3 py-1.5 ${
                                            postureChoice === preset.value && !customPosture
                                                ? 'bg-brand text-ink'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={customPosture || postureChoice}
                                onChange={(e) => setCustomPosture(e.target.value)}
                                placeholder="Ou décris ta propre posture, librement"
                                rows={2}
                                maxLength={400}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                            />
                        </div>

                        {error && <p className="text-xs text-red-500">{error}</p>}

                        <div className="flex gap-2 pt-1">
                            <button
                                type="submit"
                                disabled={saving || !title.trim() || !topic.trim()}
                                className="flex-1 bg-brand hover:bg-brand-hover text-ink font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50"
                            >
                                {saving ? 'Création...' : "Créer et ouvrir l'enregistrement"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl"
                            >
                                Annuler
                            </button>
                        </div>
                    </form>
                )}

                {exportError && <p className="text-xs text-red-500">{exportError}</p>}

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                ) : emissions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Aucune émission pour l'instant.</p>
                ) : (
                    <div className="space-y-2">
                        {emissions.map((emission) => (
                            <div key={emission.$id} className="bg-white rounded-2xl border border-gray-100 p-4">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="text-sm font-semibold text-gray-800">{emission.title}</p>
                                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 shrink-0 ${STATUS_COLORS[emission.status]}`}>
                                        {emission.status}
                                    </span>
                                </div>
                                {emission.guestName && <p className="text-xs text-gray-400 mb-1">Invité : {emission.guestName}</p>}
                                <p className="text-xs text-gray-500 mb-3">{emission.topic}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Link
                                        to={`/emissions/${emission.conversationId}/enregistrement`}
                                        className="text-xs font-semibold text-ochre bg-brand-tint rounded-full px-3 py-1.5"
                                    >
                                        Ouvrir l'enregistrement
                                    </Link>
                                    {(['pdf', 'docx'] as const).map((format) => (
                                        <button
                                            key={format}
                                            onClick={() => handleExport(emission, format)}
                                            disabled={!!exportingKey}
                                            className="text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5 disabled:opacity-50"
                                            title="Télécharger la discussion de cette émission"
                                        >
                                            {exportingKey === `${emission.$id}:${format}` ? 'Préparation...' : format === 'pdf' ? '⬇ PDF' : '⬇ Word'}
                                        </button>
                                    ))}
                                    {(['préparé', 'enregistré', 'publié'] as const).filter((s) => s !== emission.status).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => handleStatusChange(emission, s)}
                                            className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                                        >
                                            → {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
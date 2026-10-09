// src/pages/NotesPage.tsx — Vanessa
// « Mon cahier » : l'espace de notes personnel. Vanessa s'en sert comme unique base de
// connaissances quand le connecteur « Mon cahier » est actif dans le chat.
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { notesService, NOTE_MAX_TITLE, NOTE_MAX_CONTENT, type UserNote } from '@/features/notes/services/notesService';

function formatDate(iso: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function NotesPage() {
    const [notes, setNotes] = useState<UserNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Une seule zone d'édition à la fois : `editingId === 'new'` = nouvelle note.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            setNotes(await notesService.list());
        } catch (err: any) {
            setLoadError(err.message || 'Impossible de charger ton cahier.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openNew = () => { setEditingId('new'); setTitle(''); setContent(''); setFormError(null); };
    const openEdit = (n: UserNote) => { setEditingId(n.$id); setTitle(n.title); setContent(n.content); setFormError(null); };
    const closeForm = () => { setEditingId(null); setFormError(null); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() && !content.trim()) return;
        setSaving(true);
        setFormError(null);
        try {
            if (editingId === 'new') {
                const created = await notesService.create(title, content);
                setNotes((prev) => [created, ...prev]);
            } else if (editingId) {
                const updated = await notesService.update(editingId, title, content);
                // La note modifiée remonte en tête : c'est la plus récente.
                setNotes((prev) => [updated, ...prev.filter((n) => n.$id !== editingId)]);
            }
            closeForm();
        } catch (err: any) {
            setFormError(err.message || "Impossible d'enregistrer la note.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const previous = notes;
        setNotes((prev) => prev.filter((n) => n.$id !== id));
        setConfirmDeleteId(null);
        if (editingId === id) closeForm();
        try {
            await notesService.remove(id);
        } catch {
            setNotes(previous); // échec réel côté serveur : on remet la note
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return notes;
        return notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }, [notes, search]);

    const form = (
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-5 space-y-3 border border-gray-100">
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, NOTE_MAX_TITLE))}
                placeholder="Titre (optionnel)"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, NOTE_MAX_CONTENT))}
                placeholder="Écris ce que tu veux garder : un rendez-vous, une idée, un numéro, une tâche..."
                rows={8}
                autoFocus
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-y"
            />
            <p className="text-xs text-gray-300 text-right">{content.length} / {NOTE_MAX_CONTENT}</p>
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={saving || (!title.trim() && !content.trim())}
                    className="flex-1 bg-brand hover:bg-brand-hover text-ink font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50"
                >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" onClick={closeForm} className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl">
                    Annuler
                </button>
            </div>
        </form>
    );

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link to="/accueil" className="text-gray-400 hover:text-gray-600" aria-label="Retour">←</Link>
                    <h1 className="text-xl font-bold text-gray-800">📒 Mon cahier</h1>
                </div>
                <p className="text-sm text-gray-400 -mt-2">
                    Note ici tout ce que tu veux garder. C'est privé : toi seul(e) vois ton cahier. Dans le chat,
                    touche la pastille « Mon cahier » pour que Vanessa te rappelle ce que tu as noté — elle ne
                    répond alors qu'à partir de ces notes.
                </p>

                {editingId === 'new' ? form : (
                    <button
                        onClick={openNew}
                        className="w-full bg-brand hover:bg-brand-hover text-ink font-semibold text-sm py-3 rounded-2xl transition-colors"
                    >
                        + Nouvelle note
                    </button>
                )}

                {notes.length > 3 && (
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher dans mes notes"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                )}

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                ) : loadError ? (
                    <div className="text-center py-8 space-y-2">
                        <p className="text-sm text-red-500">{loadError}</p>
                        <button onClick={load} className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">Réessayer</button>
                    </div>
                ) : notes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Ton cahier est vide pour l'instant.</p>
                ) : filtered.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Aucune note ne correspond.</p>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((n) =>
                            editingId === n.$id ? (
                                <div key={n.$id}>{form}</div>
                            ) : (
                                <div key={n.$id} className="bg-white rounded-2xl border border-gray-100 p-4">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-sm font-semibold text-gray-800 break-words min-w-0">{n.title || 'Sans titre'}</p>
                                        <span className="text-xs text-gray-300 shrink-0">{formatDate(n.updatedAt)}</span>
                                    </div>
                                    {n.content && <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{n.content}</p>}
                                    <div className="flex items-center gap-3 mt-3">
                                        <button onClick={() => openEdit(n)} className="text-xs font-semibold text-gray-500 hover:text-gray-700">Modifier</button>
                                        {confirmDeleteId === n.$id ? (
                                            <span className="flex items-center gap-2 text-xs">
                                                <span className="text-red-500">Supprimer cette note ?</span>
                                                <button onClick={() => handleDelete(n.$id)} className="font-semibold text-red-500 hover:text-red-700">Oui</button>
                                                <button onClick={() => setConfirmDeleteId(null)} className="font-semibold text-gray-400 hover:text-gray-600">Non</button>
                                            </span>
                                        ) : (
                                            <button onClick={() => setConfirmDeleteId(n.$id)} className="text-xs font-semibold text-red-400 hover:text-red-600">Supprimer</button>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

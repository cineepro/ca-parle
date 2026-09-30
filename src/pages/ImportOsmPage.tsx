// src/pages/ImportOsmPage.tsx — Vanessa
// Réservé aux modérateurs. Ne publie jamais rien seul : chaque candidat
// reste "en attente" tant qu'on n'a pas cliqué explicitement "Accepter".
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LocationPicker } from '@/features/caSert/components/LocationPicker';
import { SPOT_CATEGORIES } from '@/features/caSert/config/categories';
import { importCandidateService, type ImportCandidate } from '@/features/caSert/services/importCandidateService';

const RADIUS_OPTIONS = [
    { label: '500 m', value: 500 },
    { label: '1 km', value: 1000 },
    { label: '2 km', value: 2000 },
    { label: '3 km', value: 3000 },
];

export default function ImportOsmPage() {
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [radius, setRadius] = useState(1000);
    const [category, setCategory] = useState('manger');
    const [searching, setSearching] = useState(false);
    const [searchInfo, setSearchInfo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<ImportCandidate>>({});

    const loadCandidates = useCallback(async () => {
        setLoadingList(true);
        try {
            setCandidates(await importCandidateService.list());
        } finally {
            setLoadingList(false);
        }
    }, []);

    useEffect(() => { loadCandidates(); }, [loadCandidates]);

    const handleSearch = async () => {
        if (lat === null || lng === null) return;
        setSearching(true);
        setError(null);
        setSearchInfo(null);
        try {
            const r = await importCandidateService.search(lat, lng, radius, category);
            setSearchInfo(
                r.created > 0
                    ? `${r.created} nouveau(x) candidat(s) ajouté(s) à la liste (sur ${r.found} trouvé(s) par OpenStreetMap).`
                    : `${r.found} lieu(x) trouvé(s), mais déjà tous proposés précédemment.`
            );
            await loadCandidates();
        } catch (e: any) {
            setError(e.message || 'La recherche a échoué — réessaie dans une minute.');
        } finally {
            setSearching(false);
        }
    };

    const startEdit = (c: ImportCandidate) => {
        setEditingId(c.$id);
        setEditValues({ name: c.name, quartier: c.quartier, country: c.country || 'Bénin', phone: c.phone, category: c.category });
    };

    const accept = async (c: ImportCandidate, useEdits: boolean) => {
        setBusyId(c.$id);
        try {
            await importCandidateService.accept(c.$id, useEdits ? editValues : undefined);
            setEditingId(null);
            setCandidates((prev) => prev.filter((x) => x.$id !== c.$id));
        } catch (e: any) {
            setError(e.message || "Impossible d'accepter cette fiche.");
        } finally {
            setBusyId(null);
        }
    };

    const ignore = async (c: ImportCandidate) => {
        setBusyId(c.$id);
        try {
            await importCandidateService.ignore(c.$id);
            setCandidates((prev) => prev.filter((x) => x.$id !== c.$id));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-5">
                <div className="flex items-center gap-3">
                    <Link to="/moderation" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-xl font-bold text-gray-800">Import OpenStreetMap</h1>
                </div>
                <p className="text-sm text-gray-400 -mt-2">
                    Rien n'est publié automatiquement — chaque fiche trouvée reste en attente tant que tu ne l'as pas
                    acceptée toi-même, un peu modifiée ou ignorée. Les fiches acceptées portent la mention de leur
                    origine (OpenStreetMap, licence ODbL), comme il se doit.
                </p>

                <div className="bg-white rounded-3xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-800">1. Choisis une zone</h2>
                    <LocationPicker onChange={(la, ln) => { setLat(la); setLng(ln); }} />

                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-500">Rayon :</span>
                        {RADIUS_OPTIONS.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => setRadius(r.value)}
                                className={`text-xs font-semibold rounded-full px-3 py-1.5 ${radius === r.value ? 'bg-[#FF4757] text-white' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-500">Catégorie :</span>
                        {SPOT_CATEGORIES.filter((c) => c.slug !== 'tout').map((c) => (
                            <button
                                key={c.slug}
                                onClick={() => setCategory(c.slug)}
                                className={`text-xs font-semibold rounded-full px-3 py-1.5 ${category === c.slug ? 'bg-[#FF4757] text-white' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={lat === null || searching}
                        className="w-full bg-[#FF4757] hover:bg-[#e63e4d] disabled:opacity-40 text-white font-semibold text-sm py-3 rounded-2xl"
                    >
                        {searching ? 'Recherche en cours...' : lat === null ? 'Choisis un point sur la carte' : 'Chercher sur OpenStreetMap'}
                    </button>
                    {searchInfo && <p className="text-xs text-gray-500">{searchInfo}</p>}
                    {error && <p className="text-xs text-red-500">{error}</p>}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-800">2. Relecture ({candidates.length} en attente)</h2>
                        <button onClick={loadCandidates} className="text-xs font-semibold text-[#FF4757]">Actualiser</button>
                    </div>

                    {loadingList ? (
                        <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
                    ) : candidates.length === 0 ? (
                        <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-6 text-center">
                            Rien à relire pour l'instant — lance une recherche ci-dessus.
                        </p>
                    ) : (
                        candidates.map((c) => (
                            <div key={c.$id} className="bg-white rounded-2xl border border-gray-100 p-4">
                                {editingId === c.$id ? (
                                    <div className="space-y-2">
                                        <input
                                            value={editValues.name ?? ''}
                                            onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                                            placeholder="Nom"
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                                        />
                                        <input
                                            value={editValues.quartier ?? ''}
                                            onChange={(e) => setEditValues((v) => ({ ...v, quartier: e.target.value }))}
                                            placeholder="Quartier"
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                                        />
                                        <input
                                            value={editValues.phone ?? ''}
                                            onChange={(e) => setEditValues((v) => ({ ...v, phone: e.target.value }))}
                                            placeholder="Téléphone"
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => accept(c, true)}
                                                disabled={busyId === c.$id}
                                                className="flex-1 text-xs font-bold text-white bg-[#FF4757] rounded-full py-2 disabled:opacity-50"
                                            >
                                                Enregistrer et accepter
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="text-xs font-semibold text-gray-400 px-3">Annuler</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                                                <p className="text-xs text-gray-400">
                                                    {SPOT_CATEGORIES.find((s) => s.slug === c.category)?.label || c.category}
                                                    {c.quartier ? ` · ${c.quartier}` : ''}
                                                    {c.phone ? ` · ${c.phone}` : ''}
                                                </p>
                                                {c.addressHint && <p className="text-[11px] text-gray-300">{c.addressHint}</p>}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => accept(c, false)}
                                                disabled={busyId === c.$id}
                                                className="text-xs font-bold text-white bg-[#FF4757] hover:bg-[#e63e4d] rounded-full px-3.5 py-1.5 disabled:opacity-50"
                                            >
                                                Accepter
                                            </button>
                                            <button
                                                onClick={() => startEdit(c)}
                                                className="text-xs font-semibold text-gray-600 bg-gray-100 rounded-full px-3.5 py-1.5"
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                onClick={() => ignore(c)}
                                                disabled={busyId === c.$id}
                                                className="text-xs font-semibold text-gray-400 rounded-full px-3.5 py-1.5 disabled:opacity-50"
                                            >
                                                Ignorer
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
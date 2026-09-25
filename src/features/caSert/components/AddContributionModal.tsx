// src/features/caSert/components/AddContributionModal.tsx — Vanessa
import { useState } from 'react';
import { lazy, Suspense } from 'react';
import { caSertService, uploadSpotImage } from '../services/caSertService';
const LocationPicker = lazy(() => import('./LocationPicker').then((m) => ({ default: m.LocationPicker })));
import { SPOT_CATEGORIES } from '../config/categories';
import { COUNTRIES } from '@/config/countries';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface Props {
    onClose: () => void;
    onDone: () => void;
}

type Step = 'choix' | 'lieu' | 'prix' | 'envoye';

export const AddContributionModal = ({ onClose, onDone }: Props) => {
    const { user } = useAuth();
    const [step, setStep] = useState<Step>('choix');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Champs "lieu"
    const [name, setName] = useState('');
    const [category, setCategory] = useState('manger');
    const [description, setDescription] = useState('');
    const [quartier, setQuartier] = useState('');
    const [country, setCountry] = useState('benin');
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [phone, setPhone] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);

    // Champs "prix"
    const [item, setItem] = useState('');
    const [price, setPrice] = useState('');
    const [unit, setUnit] = useState('');

    const handleSubmitSpot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;
        if (!position) {
            setError('Touche la carte pour indiquer où se trouve ce lieu — obligatoire.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            let photoFileId = '';
            if (photo) photoFileId = await uploadSpotImage(photo);
            await caSertService.createSpot({
                name: name.trim(),
                category,
                description: description.trim(),
                quartier: quartier.trim(),
                country,
                phone: phone.trim(),
                photoFileId,
                authorId: user.$id,
                authorName: user.name || '',
                latitude: position.lat,
                longitude: position.lng,
            });
            setStep('envoye');
        } catch (err: any) {
            setError(err.message || "Impossible d'ajouter ce lieu, réessaie.");
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitPrice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !item.trim() || !price) return;
        setSaving(true);
        setError(null);
        try {
            await caSertService.createPrice({
                item: item.trim(),
                price: parseInt(price, 10),
                unit: unit.trim(),
                quartier: quartier.trim(),
                country,
                authorId: user.$id,
            });
            setStep('envoye');
        } catch (err: any) {
            setError(err.message || "Impossible d'ajouter ce prix, réessaie.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md space-y-4 max-h-[85vh] overflow-y-auto">
                {step === 'choix' && (
                    <>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Balance ton bon plan</h2>
                            <p className="text-xs text-gray-400 mt-1">Qu'est-ce que tu veux partager ?</p>
                        </div>
                        <button
                            onClick={() => setStep('lieu')}
                            className="w-full flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 text-left"
                        >
                            <span className="text-2xl">📍</span>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Un lieu ou un service</p>
                                <p className="text-xs text-gray-400">Un maquis, un réparateur, une pharmacie...</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setStep('prix')}
                            className="w-full flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 text-left"
                        >
                            <span className="text-2xl">💰</span>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Un prix du moment</p>
                                <p className="text-xs text-gray-400">Essence, marché, transport...</p>
                            </div>
                        </button>
                        <Button variant="secondary" onClick={onClose} className="w-full">Annuler</Button>
                    </>
                )}

                {step === 'lieu' && (
                    <form onSubmit={handleSubmitSpot} className="space-y-3">
                        <h2 className="text-lg font-bold text-gray-800">Un lieu ou un service</h2>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nom (ex: La mafia du poulet braisé)"
                            required
                            maxLength={150}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                        />
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                        >
                            {SPOT_CATEGORIES.filter((c) => c.slug !== 'tout').map((c) => (
                                <option key={c.slug} value={c.slug}>{c.label}</option>
                            ))}
                        </select>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Décris-le à ta façon..."
                            rows={2}
                            maxLength={500}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40 resize-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                value={quartier}
                                onChange={(e) => setQuartier(e.target.value)}
                                placeholder="Quartier"
                                maxLength={100}
                                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                            />
                            <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                            >
                                {COUNTRIES.filter((c) => c.slug !== 'tous').map((c) => (
                                    <option key={c.slug} value={c.slug}>{c.flag} {c.name}</option>
                                ))}
                            </select>
                        </div>

                        <Suspense fallback={<div className="w-full h-48 rounded-xl bg-gray-100 animate-pulse" />}>
                            <LocationPicker country={country} onChange={(lat, lng) => setPosition({ lat, lng })} />
                        </Suspense>

                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Téléphone (optionnel)"
                            maxLength={30}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                            className="w-full text-xs text-gray-500"
                        />

                        {error && <p className="text-xs text-red-500">{error}</p>}

                        <div className="flex gap-2 pt-1">
                            <Button type="submit" isLoading={saving} className="flex-1">Publier</Button>
                            <Button type="button" variant="secondary" onClick={() => setStep('choix')}>Retour</Button>
                        </div>
                    </form>
                )}

                {step === 'prix' && (
                    <form onSubmit={handleSubmitPrice} className="space-y-3">
                        <h2 className="text-lg font-bold text-gray-800">Un prix du moment</h2>
                        <input
                            value={item}
                            onChange={(e) => setItem(e.target.value)}
                            placeholder="Quoi ? (ex: Essence, Sac riz 25kg...)"
                            required
                            maxLength={100}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="Prix (FCFA)"
                                required
                                min={1}
                                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                            />
                            <input
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="Unité (ex: L, tas, sac)"
                                maxLength={30}
                                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                value={quartier}
                                onChange={(e) => setQuartier(e.target.value)}
                                placeholder="Quartier/ville"
                                maxLength={100}
                                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                            />
                            <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4757]/40"
                            >
                                {COUNTRIES.filter((c) => c.slug !== 'tous').map((c) => (
                                    <option key={c.slug} value={c.slug}>{c.flag} {c.name}</option>
                                ))}
                            </select>
                        </div>

                        {error && <p className="text-xs text-red-500">{error}</p>}

                        <div className="flex gap-2 pt-1">
                            <Button type="submit" isLoading={saving} className="flex-1">Publier</Button>
                            <Button type="button" variant="secondary" onClick={() => setStep('choix')}>Retour</Button>
                        </div>
                    </form>
                )}

                {step === 'envoye' && (
                    <div className="text-center space-y-3 py-4">
                        <div className="text-4xl">👀</div>
                        <p className="text-sm font-semibold text-gray-800">Envoyé pour validation !</p>
                        <p className="text-xs text-gray-500">
                            On vérifie vite fait avant que ça apparaisse pour tout le monde. Tu peux suivre l'avancement dans "Mes contributions".
                        </p>
                        <Button onClick={onDone} className="w-full">Fermer</Button>
                    </div>
                )}
            </div>
        </div>
    );
};
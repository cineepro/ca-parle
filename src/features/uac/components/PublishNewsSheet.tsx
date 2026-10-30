// src/features/uac/components/PublishNewsSheet.tsx — Vanessa
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NEWS_KINDS, type NewsKind } from '../config';
import { uacService, type UacNews } from '../services/uacService';
import { uploadStoryImage } from '@/features/stories/services/storyService';

const MAX_IMAGE = 5 * 1024 * 1024;
const input = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-brand';

export const PublishNewsSheet = ({ defaultKind, onClose, onPublished }: { defaultKind: NewsKind; onClose: () => void; onPublished: (n: UacNews) => void }) => {
    const [kind, setKind] = useState<NewsKind>(defaultKind);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [contact, setContact] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) return setError('Choisis une image (JPG, PNG…).');
        if (f.size > MAX_IMAGE) return setError('Image trop lourde (5 Mo maximum).');
        setError(null);
        setImage(f);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            const imageId = image ? await uploadStoryImage(image) : undefined;
            const news = await uacService.publishNews({ kind, title, content, contact, eventDate, imageId });
            onPublished(news);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Publication impossible, réessaie.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label="Publier une actualité">
            <form onSubmit={submit} className="w-full max-w-[480px] max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-cream p-5 space-y-3">
                <div className="flex items-center">
                    <h2 className="font-display text-lg font-bold text-ink">Publier une actualité</h2>
                    <button type="button" onClick={onClose} aria-label="Fermer" className="ml-auto p-1.5 text-gray-500"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex flex-wrap gap-2" role="group" aria-label="Type d’actualité">
                    {NEWS_KINDS.map((k) => (
                        <button key={k.slug} type="button" aria-pressed={kind === k.slug} onClick={() => setKind(k.slug)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium ${kind === k.slug ? 'bg-brand text-ink' : 'bg-white border border-gray-300 text-gray-700'}`}>
                            {k.icon} {k.name}
                        </button>
                    ))}
                </div>

                <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Titre (ex. Chambre à louer à Tankpè)" aria-label="Titre" required />
                <textarea className={`${input} min-h-[120px]`} value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} placeholder="Détails : quoi, où, quand, conditions…" aria-label="Détails" required />
                <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-gray-600">Date (si c’est un événement)
                        <input type="date" className={`${input} mt-1`} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                    </label>
                    <label className="text-xs text-gray-600">Contact (téléphone…)
                        <input className={`${input} mt-1`} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} />
                    </label>
                </div>
                <label className="block text-xs text-gray-600">Photo ou affiche (facultatif)
                    <input type="file" accept="image/*" onChange={pickImage} className="mt-1 block w-full text-sm" />
                </label>

                {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
                <p className="text-xs text-gray-500">Ton nom sera affiché. Les annonces trompeuses (fausses locations, faux emplois) sont supprimées et peuvent entraîner un blocage.</p>
                <Button type="submit" fullWidth isLoading={busy}>Publier</Button>
            </form>
        </div>
    );
};

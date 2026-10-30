// src/features/uac/components/NewsCard.tsx — Vanessa
import { NEWS_KINDS } from '../config';
import type { UacNews } from '../services/uacService';
import { getStoryImageUrl } from '@/features/stories/services/storyService';

const KIND = Object.fromEntries(NEWS_KINDS.map((k) => [k.slug, k]));

function timeAgo(iso: string): string {
    const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (min < 1) return 'à l’instant';
    if (min < 60) return `il y a ${min} min`;
    if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
    const d = Math.round(min / 1440);
    return d === 1 ? 'hier' : `il y a ${d} jours`;
}

const frDate = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export const NewsCard = ({ news, canDelete, onDelete }: { news: UacNews; canDelete: boolean; onDelete: (id: string) => void }) => {
    const kind = KIND[news.kind] || KIND.autre;
    return (
        <article className="rounded-2xl bg-white border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-brand-tint text-ink font-semibold px-2.5 py-1">{kind.icon} {kind.name}</span>
                {news.eventDate && <span className="text-ochre font-semibold">📅 {frDate(news.eventDate)}</span>}
                <span className="ml-auto text-gray-400">{timeAgo(news.createdAt)}</span>
            </div>
            <h3 className="mt-2 text-base font-bold text-ink break-words">{news.title}</h3>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-line break-words">{news.content}</p>
            {news.imageId && (
                <img src={getStoryImageUrl(news.imageId)} alt="" loading="lazy" className="mt-3 w-full max-h-72 object-cover rounded-xl" />
            )}
            {news.contact && <p className="mt-3 text-sm text-ink bg-sand rounded-lg px-3 py-2">📞 {news.contact}</p>}
            <div className="mt-3 flex items-center text-xs text-gray-400">
                <span>Publié par {news.authorName || 'un étudiant'}</span>
                {canDelete && (
                    <button type="button" onClick={() => onDelete(news.$id)} className="ml-auto text-red-600 font-semibold">Supprimer</button>
                )}
            </div>
        </article>
    );
};

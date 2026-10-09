// src/features/stories/components/StoryReel.tsx — Vanessa
// Une histoire en plein écran, façon TikTok : on défile pour passer à la
// suivante, on touche le texte pour ouvrir l'histoire complète, et les
// boutons de droite permettent de réagir, commenter et partager.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, Flame, MessageCircle, Pin, Share2, Check, Sparkles } from 'lucide-react';
import type { Story } from '../services/storyService';
import { getStoryImageUrl } from '../services/storyService';
import { StoryTypeBadge } from './StoryTypeBadge';
import { StoryStatusBadge } from './StoryStatusBadge';
import { VANESSA_USER_ID } from '@/api/constants';
import { useReactions } from '@/features/reactions/hooks/useReactions';
import { recordSignal } from '../utils/feedRanking';

const timeAgo = (dateStr: string): string => {
    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} j`;
};

const compact = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

const railButton =
    'w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors disabled:opacity-60';

// ── Boutons de droite ─────────────────────────────────────────────────────

// Version "vivante" : charge les réactions réelles. Montée seulement pour
// l'histoire affichée et ses voisines, afin de ne pas lancer des dizaines de
// requêtes pour tout le fil.
const LiveActions = ({ story }: { story: Story }) => {
    const { total, userReaction, react, submitting } = useReactions('story', story.$id, story.reactionsCount);
    const liked = userReaction === 'fire';

    const handleFire = () => {
        if (!liked) recordSignal(story, 3);
        react('fire');
    };

    return (
        <FireButton liked={liked} count={total} onClick={handleFire} disabled={submitting} />
    );
};

const FireButton = ({
    liked, count, onClick, disabled,
}: { liked: boolean; count: number; onClick?: () => void; disabled?: boolean }) => (
    <div className="flex flex-col items-center gap-1">
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || !onClick}
            aria-pressed={liked}
            aria-label={liked ? 'Retirer ma réaction' : 'Réagir : chaud'}
            className={`${railButton} ${liked ? 'bg-brand text-ink' : 'bg-white/15 text-white hover:bg-white/25'}`}
        >
            <Flame className="w-6 h-6" aria-hidden="true" />
        </button>
        <span className="text-xs font-semibold text-white">{compact(count)}</span>
    </div>
);

const ShareAction = ({ story }: { story: Story }) => {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const url = `${window.location.origin}/histoire/${story.$id}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: `Vanessa — ${story.title}`, url });
            } catch {
                // Partage annulé.
            }
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Presse-papier inaccessible.
        }
    };

    return (
        <div className="flex flex-col items-center gap-1">
            <button
                type="button"
                onClick={handleShare}
                aria-label="Partager cette histoire"
                className={`${railButton} bg-white/15 text-white hover:bg-white/25`}
            >
                {copied ? <Check className="w-6 h-6" aria-hidden="true" /> : <Share2 className="w-6 h-6" aria-hidden="true" />}
            </button>
            <span className="text-xs font-semibold text-white" aria-live="polite">{copied ? 'Copié' : 'Partager'}</span>
        </div>
    );
};

// ── La carte plein écran ──────────────────────────────────────────────────

interface Props {
    story: Story;
    // true pour l'histoire affichée et ses voisines immédiates.
    near: boolean;
}

export const StoryReel = ({ story, near }: Props) => {
    const excerpt = story.content.length > 420 ? `${story.content.slice(0, 420)}…` : story.content;
    const cover = story.coverImageId ? getStoryImageUrl(story.coverImageId) : null;
    const detailUrl = `/histoire/${story.$id}`;

    return (
        <article
            aria-label={story.title}
            className="relative h-full w-full snap-start snap-always overflow-hidden bg-ink text-white"
        >
            {/* Fond : photo floutée si l'histoire en a une, sinon dégradé chaud. */}
            {cover ? (
                <img
                    src={cover}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
                />
            ) : (
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-b from-ink via-gray-800 to-[#4A3320]"
                />
            )}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-ink/60" />

            {/* Zone de lecture : un toucher ouvre l'histoire complète. */}
            <Link
                to={detailUrl}
                onClick={() => recordSignal(story, 4)}
                className="absolute inset-0 flex flex-col justify-end gap-3 pl-5 pr-20 pt-40 pb-6 focus-visible:outline-brand"
            >
                <div className="flex items-center gap-2 flex-wrap">
                    <StoryTypeBadge type={story.type} />
                    {story.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-ink">
                            <Pin className="w-3.5 h-3.5" aria-hidden="true" /> À la une
                        </span>
                    )}
                </div>

                <h2 className="font-display text-3xl font-bold leading-tight text-white">{story.title}</h2>

                {cover && (
                    <img
                        src={cover}
                        alt=""
                        loading="lazy"
                        className="w-full max-h-[32%] rounded-2xl object-cover shadow-lg"
                    />
                )}

                <p className="text-lg leading-relaxed text-white/90 line-clamp-6 whitespace-pre-line">{excerpt}</p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
                    <span className="inline-flex items-center gap-1 font-semibold text-white">
                        {story.isAnonymous ? (
                            <><EyeOff className="w-4 h-4" aria-hidden="true" /> Anonyme</>
                        ) : (
                            story.authorName || 'Utilisateur'
                        )}
                        {story.authorId === VANESSA_USER_ID && (
                            <span className="inline-flex items-center gap-1 text-brand">
                                <Sparkles className="w-4 h-4" aria-hidden="true" /> IA
                            </span>
                        )}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{timeAgo(story.$createdAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-white [&_span]:!text-white/80"><StoryStatusBadge status={story.status} /></span>
                </div>

                <span className="mt-1 inline-flex w-fit items-center rounded-full bg-brand px-4 py-2 font-display text-sm font-semibold text-ink">
                    Lire et commenter
                </span>
            </Link>

            {/* Boutons de droite */}
            <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
                {near ? <LiveActions story={story} /> : <FireButton liked={false} count={story.reactionsCount} />}

                <div className="flex flex-col items-center gap-1">
                    <Link
                        to={`${detailUrl}#commentaires`}
                        onClick={() => recordSignal(story, 4)}
                        aria-label={`Voir les ${story.commentsCount} commentaires`}
                        className={`${railButton} bg-white/15 text-white hover:bg-white/25`}
                    >
                        <MessageCircle className="w-6 h-6" aria-hidden="true" />
                    </Link>
                    <span className="text-xs font-semibold text-white">{compact(story.commentsCount || 0)}</span>
                </div>

                <ShareAction story={story} />
            </div>
        </article>
    );
};
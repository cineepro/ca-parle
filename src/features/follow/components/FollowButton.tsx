// src/features/follow/components/FollowButton.tsx — Vanessa
import { useFollow } from '../hooks/useFollow';
import type { FollowingType } from '../services/followService';
import { Button } from '@/components/ui/button';
import { Check, Plus } from 'lucide-react';

interface Props {
    followingId: string;
    followingType: FollowingType;
    initialCount?: number;
}

export const FollowButton = ({ followingId, followingType, initialCount }: Props) => {
    const { isFollowing, count, loading, toggle } = useFollow(followingId, followingType, initialCount);

    return (
        <div className="flex items-center gap-2">
            <Button
                variant={isFollowing ? 'secondary' : 'primary'}
                size="sm"
                onClick={toggle}
                isLoading={loading}
            >
                {isFollowing ? <><Check className="w-4 h-4" aria-hidden="true" /> Suivi</> : <><Plus className="w-4 h-4" aria-hidden="true" /> Suivre</>}
            </Button>
            <span className="text-xs text-gray-400">{count} abonné{count > 1 ? 's' : ''}</span>
        </div>
    );
};

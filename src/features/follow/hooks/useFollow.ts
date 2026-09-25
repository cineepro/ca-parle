// src/features/follow/hooks/useFollow.ts — Vanessa
import { useState, useEffect, useCallback } from 'react';
import { followService, type FollowingType } from '../services/followService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { referenceService } from '@/features/references/services/referenceService';

export const useFollow = (followingId: string, followingType: FollowingType, initialCount = 0) => {
    const { user } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [count, setCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!user) return;
        const existing = await followService.isFollowing(user.$id, followingId, followingType);
        setIsFollowing(!!existing);
    }, [user, followingId, followingType]);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = async () => {
        if (!user || loading) return;
        setLoading(true);
        try {
            if (isFollowing) {
                await followService.unfollow(user.$id, followingId, followingType);
                setIsFollowing(false);
                setCount((c) => Math.max(0, c - 1));
                if (followingType === 'reference') await referenceService.updateFollowersCount(followingId, -1);
            } else {
                await followService.follow(user.$id, followingId, followingType);
                setIsFollowing(true);
                setCount((c) => c + 1);
                if (followingType === 'reference') await referenceService.updateFollowersCount(followingId, 1);
            }
        } finally {
            setLoading(false);
        }
    };

    return { isFollowing, count, loading, toggle };
};

// src/features/notifications/hooks/useNotifications.ts — Ça Parle
import { useState, useEffect, useCallback } from 'react';
import { notificationService, type AppNotification } from '../services/notificationService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { client } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { Query } from 'appwrite';

// Anciennement un polling toutes les 30s (2 lectures en base par
// utilisateur actif, en continu) — remplacé par un vrai abonnement
// Realtime filtré CÔTÉ SERVEUR sur `userId` (SDK v22+, Realtime queries).
// Un seul chargement initial au montage, puis plus aucune lecture tant
// qu'aucune nouvelle notification n'arrive réellement.
export const useNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user) return;
        try {
            const [list, count] = await Promise.all([
                notificationService.getByUser(user.$id),
                notificationService.getUnreadCount(user.$id),
            ]);
            setNotifications(list);
            setUnreadCount(count);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!user) return;
        const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.NOTIFICATIONS}.documents`;
        const unsubscribe = client.subscribe(
            channel,
            (response: any) => {
                const isCreate = response.events?.some((e: string) => e.endsWith('.create'));
                if (!isCreate) return;
                const notif = response.payload as AppNotification;
                setNotifications((prev) => [notif, ...prev].slice(0, 30));
                if (!notif.read) setUnreadCount((c) => c + 1);
            },
            [Query.equal('userId', [user.$id])]
        );
        return unsubscribe;
    }, [user]);

    const markAsRead = async (id: string) => {
        await notificationService.markRead(id);
        setNotifications((prev) => prev.map((n) => (n.$id === id ? { ...n, read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
    };

    const markAllAsRead = async () => {
        if (!user) return;
        await notificationService.markAllRead(user.$id);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: load };
};
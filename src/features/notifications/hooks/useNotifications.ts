// src/features/notifications/hooks/useNotifications.ts — Ça Parle
import { useState, useEffect, useCallback } from 'react';
import { notificationService, type AppNotification } from '../services/notificationService';
import { useAuth } from '@/features/auth/hooks/useAuth';

// Rafraîchissement périodique simple (pas de temps réel Appwrite branché
// ici) — suffisant pour un badge de compteur qui reste raisonnablement à
// jour sans complexifier l'architecture avec des souscriptions Realtime.
const POLL_INTERVAL_MS = 30_000;

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
        const interval = setInterval(load, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [load]);

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

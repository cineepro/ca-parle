// src/features/notifications/services/pushService.ts — Vanessa
import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';
import { account } from '@/api/appwrite';
import { ID } from 'appwrite';

const REGISTERED_FLAG_KEY = 'ca_parle_push_registered_for_user';

// Enregistre l'appareil pour recevoir de vraies notifications push
// (même app fermée), UNIQUEMENT sur l'app native (Android/iOS) — le web
// n'utilise pas ce plugin, il garde le système de notifications en
// polling déjà en place, ce qui reste suffisant pour un onglet ouvert.
export async function initPushNotifications(userId: string, onNavigate: (url: string) => void) {
    if (!Capacitor.isNativePlatform()) return;

    // Évite de ré-enregistrer à chaque ouverture d'app pour le même
    // utilisateur — un jeton reste valable une fois créé.
    if (localStorage.getItem(REGISTERED_FLAG_KEY) === userId) {
        attachListeners(onNavigate);
        return;
    }

    try {
        const permStatus = await PushNotifications.checkPermissions();
        let granted = permStatus.receive === 'granted';

        if (!granted) {
            const requested = await PushNotifications.requestPermissions();
            granted = requested.receive === 'granted';
        }

        if (!granted) return; // L'utilisateur a refusé — on ne force rien.

        attachListeners(onNavigate);

        PushNotifications.addListener('registration', async (token: Token) => {
            try {
                // Lie ce jeton d'appareil au compte Appwrite actuel — c'est
                // ce qui permet à nos Functions d'envoyer un push ciblé à
                // CET utilisateur précis via le service Messaging.
                await account.createPushTarget(ID.unique(), token.value);
                localStorage.setItem(REGISTERED_FLAG_KEY, userId);
            } catch {
                // Non bloquant — l'utilisateur garde les notifications en
                // polling dans l'app, juste pas de push natif cette fois.
            }
        });

        await PushNotifications.register();
    } catch {
        // Non bloquant — l'app continue de fonctionner sans push natif.
    }
}

function attachListeners(onNavigate: (url: string) => void) {
    // Notification reçue alors que l'app est déjà ouverte au premier
    // plan : rien de spécial à faire, le système de notifications en
    // polling/temps réel prend déjà le relais visuellement dans l'app.
    PushNotifications.addListener('pushNotificationReceived', (_notification: PushNotificationSchema) => {
        // Volontairement vide.
    });

    // L'utilisateur a appuyé sur la notification (app fermée ou en fond) :
    // on le redirige directement vers le bon endroit (conversation,
    // histoire...), comme sur toute app native.
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const url = action.notification?.data?.url;
        if (url && typeof url === 'string') {
            onNavigate(url);
        }
    });
}
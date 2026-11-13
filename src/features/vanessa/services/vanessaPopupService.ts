// src/features/vanessa/services/vanessaPopupService.ts — Vanessa
// Pop-ups d'information affichés à l'ouverture d'une conversation avec Vanessa
// (nouveautés, ajustements, « comment utiliser Vanessa »...). Les messages sont
// écrits à la main dans la collection Appwrite « vanessa_popups » : aucune
// Function n'est nécessaire, la collection est simplement lisible par les
// utilisateurs connectés (aucun droit d'écriture côté client).
import { Query } from 'appwrite';
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/constants';

export interface VanessaPopup {
    $id: string;
    title: string;
    message: string;
    icon?: string; // un emoji, ex. 💡
    buttonLabel?: string; // ex. « J'ai compris »
    active: boolean;
}

// Mémorise le dernier pop-up montré, pour ne jamais afficher le même deux
// fois de suite à la même personne (tant qu'il y en a plusieurs d'actifs).
const LAST_POPUP_KEY = 'vanessa_last_popup_id';

function readLastPopupId(): string | null {
    try {
        return localStorage.getItem(LAST_POPUP_KEY);
    } catch {
        return null; // stockage indisponible (navigation privée...) : pas grave
    }
}

function writeLastPopupId(id: string) {
    try {
        localStorage.setItem(LAST_POPUP_KEY, id);
    } catch {
        /* sans importance */
    }
}

export const vanessaPopupService = {
    // Renvoie UN pop-up actif tiré au hasard, ou null s'il n'y en a aucun.
    // Ne lève jamais d'erreur : un souci ici ne doit JAMAIS gêner l'accès à Vanessa.
    async pickRandom(): Promise<VanessaPopup | null> {
        if (!COLLECTIONS.VANESSA_POPUPS) return null; // collection pas encore configurée
        try {
            const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VANESSA_POPUPS, [
                Query.equal('active', true),
                Query.limit(50),
            ]);
            const popups = result.documents as unknown as VanessaPopup[];
            if (popups.length === 0) return null;

            const lastId = readLastPopupId();
            const candidates = popups.length > 1 ? popups.filter((p) => p.$id !== lastId) : popups;
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];
            writeLastPopupId(chosen.$id);
            return chosen;
        } catch {
            return null;
        }
    },
};
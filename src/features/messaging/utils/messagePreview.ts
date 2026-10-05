// src/features/messaging/utils/messagePreview.ts — Vanessa
import type { Message } from '../services/messageService';
import { parseFileMeta } from '../services/messageService';

// Résumé d'un message en une ligne — même logique que côté serveur
// (buildReplyPreview dans send-message), pour l'encadré "Réponse à…".
export function getMessagePreview(message: Message): string {
    const text = (message.content || '').replace(/\[\[SUGGESTION_POST[\s\S]*$/, '').trim();
    if (message.type === 'audio') return '🎤 Message vocal';
    if (message.type === 'image') return `📷 ${text ? text.slice(0, 120) : 'Photo'}`;
    if (message.type === 'file') return `📎 ${parseFileMeta(message)?.name || 'Document'}`;
    return text.slice(0, 140);
}

// Texte copiable d'un message : le texte, ou la légende / transcription.
export function getCopyableText(message: Message): string {
    return (message.content || '').replace(/\[\[SUGGESTION_POST[\s\S]*$/, '').trim();
}

export function formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

// Copie dans le presse-papiers, avec repli pour les contextes où l'API
// moderne n'est pas disponible (WebView Android, vieux navigateurs).
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch { /* on tente le repli */ }
    try {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(area);
        return ok;
    } catch {
        return false;
    }
}
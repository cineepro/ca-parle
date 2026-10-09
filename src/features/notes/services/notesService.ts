// src/features/notes/services/notesService.ts — Vanessa
// Cahier de notes personnel. Tout passe par la Function `manage-notes`, qui ne
// donne accès qu'aux notes de la personne connectée.
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export interface UserNote {
    $id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export const NOTE_MAX_TITLE = 120;
export const NOTE_MAX_CONTENT = 5000;

export const notesService = {
    async list(): Promise<UserNote[]> {
        const result = await callFunction<{ notes: UserNote[] }>(FUNCTIONS.MANAGE_NOTES, { action: 'list' });
        return result.notes;
    },

    async create(title: string, content: string): Promise<UserNote> {
        const result = await callFunction<{ note: UserNote }>(FUNCTIONS.MANAGE_NOTES, { action: 'create', title, content });
        return result.note;
    },

    async update(id: string, title: string, content: string): Promise<UserNote> {
        const result = await callFunction<{ note: UserNote }>(FUNCTIONS.MANAGE_NOTES, { action: 'update', id, title, content });
        return result.note;
    },

    async remove(id: string): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_NOTES, { action: 'delete', id });
    },
};

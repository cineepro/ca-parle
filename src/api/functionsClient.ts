// src/api/functionsClient.ts — Ça Parle
import { functions } from './appwrite';

export class FunctionCallError extends Error {}

/**
 * Appelle une Appwrite Function de façon synchrone et retourne sa réponse
 * JSON. Utilisé pour toutes les actions sensibles (résolution de
 * prédiction, modération, incrémentation de vue) désormais traitées côté
 * serveur plutôt qu'en écriture directe depuis le client.
 */
export async function callFunction<T = any>(functionId: string, payload: object = {}): Promise<T> {
    const execution = await functions.createExecution(
        functionId,
        JSON.stringify(payload),
        false // synchrone : on attend le résultat
    );

    if (execution.status === 'failed') {
        throw new FunctionCallError(`La fonction "${functionId}" a échoué.`);
    }

    let body: any = {};
    try {
        body = execution.responseBody ? JSON.parse(execution.responseBody) : {};
    } catch {
        throw new FunctionCallError(`Réponse invalide de la fonction "${functionId}".`);
    }

    if (body.success === false) {
        throw new FunctionCallError(body.error || `La fonction "${functionId}" a refusé l'action.`);
    }

    return body as T;
}
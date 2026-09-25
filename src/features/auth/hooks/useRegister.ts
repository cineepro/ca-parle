// src/features/auth/hooks/useRegister.ts — Vanessa
import { useState } from 'react';
import { authService } from '../services/authService';
import { account } from '@/api/appwrite';
import { dbService } from '@/api/database';
import { checkEmailDomain } from '@/utils/emailDomainValidator';
import { normalizePhone } from '@/utils/phoneValidator';

export const useRegister = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const register = async (
        name: string,
        email: string,
        password: string,
        phone?: string,
    ) => {
        setLoading(true);
        setError(null);

        try {
            // ÉTAPE 0 : validation du domaine email (repris de Kinema+)
            const domainCheck = await checkEmailDomain(email);
            if (!domainCheck.valid) {
                setError(
                    domainCheck.reason === 'malformed'
                        ? "Le format de l'adresse email n'est pas valide."
                        : "Le domaine de cette adresse email semble introuvable ou mal orthographié. Vérifie ton adresse."
                );
                setLoading(false);
                return;
            }

            // ÉTAPE 0bis : normalisation du téléphone si saisi (optionnel)
            let normalizedPhone: string | undefined;
            if (phone && phone.trim()) {
                const result = normalizePhone(phone);
                if (!result) {
                    setError("Le numéro de téléphone saisi n'est pas valide.");
                    setLoading(false);
                    return;
                }
                normalizedPhone = result;
            }

            // ÉTAPE 1 : créer le compte Auth
            await authService.register(email, password, name);

            // ÉTAPE 2 : connexion temporaire (nécessaire pour createVerification)
            await authService.loginForVerification(email, password);

            // ÉTAPE 3 : récupérer l'utilisateur
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('Impossible de récupérer le compte après connexion.');
            }

            // ÉTAPE 4 : stocker en session le nécessaire pour la finalisation
            // du profil après clic sur le lien de vérification.
            sessionStorage.setItem('pendingVerificationEmail', email);
            sessionStorage.setItem('pendingVerificationUserId', currentUser.$id);
            if (normalizedPhone) {
                sessionStorage.setItem('pendingPhone', normalizedPhone);
            }

            // ÉTAPE 4bis : on peut aussi pré-créer/compléter le document ici
            // via une tentative douce (silencieuse si la collection users
            // interdit l'écriture avant vérification — dans ce cas le
            // téléphone sera repris au moment du login() dans authService).
            try {
                await dbService.createUserProfile({
                    userId: currentUser.$id,
                    name,
                    email,
                    phone: normalizedPhone,
                    createdAt: new Date().toISOString(),
                });
            } catch {
                // Normal si les permissions bloquent l'écriture avant
                // vérification — le profil sera créé/complété au login().
            }

            // ÉTAPE 5 : envoyer l'email de vérification
            const redirectUrl = `${window.location.origin}/email-confirmed`;
            await account.createVerification(redirectUrl);

            // ÉTAPE 6 : détruire la session — accès interdit avant vérification
            let sessionDeleted = false;
            for (let attempt = 0; attempt < 2 && !sessionDeleted; attempt++) {
                try {
                    await account.deleteSession('current');
                    sessionDeleted = true;
                } catch (logoutErr) {
                    console.warn(`⚠️ deleteSession échoué (tentative ${attempt + 1}/2):`, logoutErr);
                }
            }
            if (!sessionDeleted) {
                console.error(
                    '⚠️ La session n\'a pas pu être supprimée après inscription. ' +
                    'Vérifie que les permissions des collections exigent bien un rôle "vérifié".'
                );
            }

            // ÉTAPE 7 : rediriger vers la page d'attente
            window.location.href = '/verify-email';
        } catch (err: any) {
            if (err?.code === 409 || err?.message?.includes('already exists')) {
                setError('Un compte existe déjà avec cette adresse email. Connecte-toi.');
            } else {
                setError(err.message || "Erreur lors de l'inscription");
            }
        } finally {
            setLoading(false);
        }
    };

    return { register, loading, error };
};

// src/features/auth/components/PhoneReminderBanner.tsx — Ça Parle
// S'affiche uniquement pour les utilisateurs connectés dont `phone` est
// vide (typiquement les anciens comptes Kinema+ qui n'avaient pas ce
// champ). Non bloquant : l'utilisateur peut fermer et continuer.
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { dbService } from '@/api/database';
import { normalizePhone } from '@/utils/phoneValidator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const PhoneReminderBanner = () => {
    const { user, refresh } = useAuth();
    const [dismissed, setDismissed] = useState(false);
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!user || user.phone || dismissed) return null;

    const handleSave = async () => {
        const normalized = normalizePhone(phone);
        if (!normalized) {
            setError('Numéro invalide.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await dbService.updateUserPhone(user.$id, normalized);
            await refresh();
        } catch {
            setError("Impossible d'enregistrer le numéro, réessaie.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-[#FF4757]/5 border border-[#FF4757]/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">
                    📱 Ajoute ton numéro pour sécuriser ton compte
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                    Optionnel, mais recommandé.
                </p>
            </div>
            <div className="flex gap-2 items-start">
                <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+229 XX XX XX XX"
                    className="w-44"
                />
                <Button size="sm" variant="primary" onClick={handleSave} isLoading={saving}>
                    Ajouter
                </Button>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="text-gray-400 hover:text-gray-600 text-sm px-2"
                    aria-label="Fermer"
                >
                    ✕
                </button>
            </div>
            {error && <p className="text-xs text-red-500 sm:ml-2">{error}</p>}
        </div>
    );
};
// src/features/profile/components/ProfileHeaderCard.tsx — Vanessa
// En-tête du profil : photo modifiable. Le nom et l'e-mail s'affichent mais ne
// se modifient pas (choix de sécurité).
import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';
import type { UserProfile } from '@/api/auth';
import { profileService, avatarUploadEnabled } from '../services/profileService';
import { UserName } from './UserName';

export const ProfileHeaderCard = ({ user }: { user: UserProfile }) => {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
    const setUser = useAuthStore((s) => s.setUser);

    const sync = (url: string) => {
        setAvatarUrl(url);
        setUser({ ...user, avatarUrl: url } as UserProfile);
    };

    const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setBusy(true);
        setError(null);
        try {
            sync(await profileService.uploadAvatar(user.$id, file));
        } catch (err: any) {
            setError(err?.message || "Impossible d'enregistrer la photo.");
        } finally {
            setBusy(false);
        }
    };

    const onRemove = async () => {
        setBusy(true);
        setError(null);
        try {
            await profileService.removeAvatar(user.$id);
            sync('');
        } catch (err: any) {
            setError(err?.message || 'Impossible de retirer la photo.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Avatar name={user.name} userId={user.$id} avatarUrl={avatarUrl} sizeClass="w-20 h-20 text-2xl" />
                    {avatarUploadEnabled() && (
                        <button
                            type="button"
                            onClick={() => input.current?.click()}
                            disabled={busy}
                            aria-label="Changer ma photo"
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand text-ink flex items-center justify-center shadow border-2 border-white disabled:opacity-50"
                        >
                            <Camera className="w-4 h-4" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-lg font-bold text-ink truncate">
                        <UserName name={user.name || 'Utilisateur'} certified={user.isCertified === true} />
                    </p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    {avatarUploadEnabled() && (
                        <div className="flex gap-3 mt-1.5 text-sm">
                            <button type="button" onClick={() => input.current?.click()} disabled={busy} className="font-semibold text-ochre disabled:opacity-50">
                                {busy ? 'Envoi...' : avatarUrl ? 'Changer la photo' : 'Ajouter une photo'}
                            </button>
                            {avatarUrl && !busy && (
                                <button type="button" onClick={onRemove} className="text-gray-500">Retirer</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
    );
};

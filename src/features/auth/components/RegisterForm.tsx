// src/features/auth/components/RegisterForm.tsx — Vanessa
import { useState } from 'react';
import { useRegister } from '../hooks/useRegister';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const RegisterForm = () => {
    const { register, loading, error } = useRegister();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptedPrivacy) return;
        register(name, email, password, phone || undefined);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Input
                label="Nom complet"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jean Dupont"
                required
            />
            <Input
                label="Adresse email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
            />
            <div>
                <Input
                    label="Numéro de téléphone (optionnel)"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+229 XX XX XX XX"
                />
                <p className="text-xs text-gray-400 mt-1">
                    Pas obligatoire, mais utile pour sécuriser ton compte.
                </p>
            </div>
            <Input
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                required
                minLength={8}
            />

            <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4">
                <input
                    type="checkbox"
                    id="accept-privacy"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#FF4757] cursor-pointer shrink-0"
                    required
                />
                <label htmlFor="accept-privacy" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
                    J'ai lu et j'accepte la{' '}
                    <Link to="/privacy" target="_blank" className="text-[#FF4757] font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                        politique de confidentialité
                    </Link>{' '}
                    et les{' '}
                    <Link to="/terms" target="_blank" className="text-[#FF4757] font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                        conditions d'utilisation
                    </Link>{' '}
                    de Vanessa. Je comprends que mon email sera vérifié avant l'activation du compte.
                </label>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                    ❌ {error}
                </div>
            )}

            <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={loading}
                disabled={!acceptedPrivacy || loading}
            >
                Créer mon compte
            </Button>

            {!acceptedPrivacy && (
                <p className="text-xs text-gray-400 text-center">
                    Accepte la politique de confidentialité pour continuer
                </p>
            )}

            <div className="text-center text-sm">
                Déjà un compte ?{' '}
                <Link to="/login" className="text-[#FF4757] font-semibold hover:underline">
                    Se connecter
                </Link>
            </div>
        </form>
    );
};

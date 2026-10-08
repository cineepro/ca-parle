// src/pages/LoginPage.tsx — Vanessa
import { LoginForm } from '@/features/auth/components/LoginForm';
import { VANESSA_AVATAR_URL } from '@/api/constants';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-8">
            <main className="w-full max-w-md bg-white rounded-3xl shadow-md border border-gray-200 p-6 sm:p-8">
                <div className="text-center mb-8">
                    <img
                        src={VANESSA_AVATAR_URL}
                        alt=""
                        className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-brand"
                    />
                    <h1 className="text-3xl font-bold text-ink">Vanessa</h1>
                    <p className="text-base text-gray-600 mt-1">« Ça parle de quoi aujourd'hui ? »</p>
                </div>
                <LoginForm />
            </main>
        </div>
    );
}

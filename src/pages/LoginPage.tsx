// src/pages/LoginPage.tsx — Ça Parle
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[#FF4757]">Ça Parle</h1>
                    <p className="text-sm text-gray-500 mt-1">« Ça parle de quoi aujourd'hui ? »</p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}

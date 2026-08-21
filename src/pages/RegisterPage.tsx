// src/pages/RegisterPage.tsx — Ça Parle
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[#FF4757]">Ça Parle</h1>
                    <p className="text-sm text-gray-500 mt-1">« Ça parle de quoi aujourd'hui ? »</p>
                </div>
                <RegisterForm />
            </div>
        </div>
    );
}
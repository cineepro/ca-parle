// src/pages/NotFoundPage.tsx — Ça Parle
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center space-y-3">
                <div className="text-5xl">🤷</div>
                <h1 className="text-2xl font-bold text-gray-800">Page introuvable</h1>
                <p className="text-sm text-gray-400">Cette page n'existe pas, ou plus.</p>
                <Link
                    to="/"
                    className="inline-block bg-[#FF4757] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#e63e4d] transition-all mt-2"
                >
                    Retour à l'accueil
                </Link>
            </div>
        </div>
    );
}

// src/pages/NotFoundPage.tsx — Vanessa
import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center space-y-3">
                <div className=""><SearchX className="w-14 h-14 text-ochre mx-auto" aria-hidden="true" /></div>
                <h1 className="text-2xl font-bold text-gray-800">Page introuvable</h1>
                <p className="text-sm text-gray-400">Cette page n'existe pas, ou plus.</p>
                <Link
                    to="/"
                    className="inline-block bg-brand text-ink px-5 py-2.5 rounded-xl font-semibold hover:bg-brand-hover transition-all mt-2"
                >
                    Retour à l'accueil
                </Link>
            </div>
        </div>
    );
}

// src/pages/MemoryPage.tsx — Vanessa
import { Link } from 'react-router-dom';
import { VanessaMemoryPanel } from '@/features/vanessa/components/VanessaMemoryPanel';

export default function MemoryPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link to="/profil" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-xl font-bold text-gray-800">Ce que Vanessa garde sur toi</h1>
                </div>
                <VanessaMemoryPanel />
            </div>
        </div>
    );
}

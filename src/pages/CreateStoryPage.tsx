// src/pages/CreateStoryPage.tsx — Vanessa
import { Link } from 'react-router-dom';
import { CreateStoryForm } from '@/features/stories/components/CreateStoryForm';

export default function CreateStoryPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <Link to="/ca-parle" className="text-gray-400 hover:text-gray-600">←</Link>
                    <h1 className="text-xl font-bold text-gray-800">📢 Publier une histoire</h1>
                </div>
                <div className="bg-white rounded-3xl p-6">
                    <CreateStoryForm />
                </div>
            </div>
        </div>
    );
}

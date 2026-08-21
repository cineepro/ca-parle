// src/pages/MessagesPage.tsx — Ça Parle
// Provisoire : sera remplacée par la vraie messagerie (liste de
// conversations + fil de discussion) une fois les collections
// `conversations` et `messages` créées et le service branché.
export default function MessagesPage() {
    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-sm font-medium text-gray-600">La messagerie arrive bientôt.</p>
                    <p className="text-xs text-gray-400 mt-1">Tu pourras bientôt discuter en direct avec les autres membres.</p>
                </div>
            </div>
        </div>
    );
}
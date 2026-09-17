// src/pages/PartnerSpacePage.tsx — Ça Parle
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { vanessaKnowledgeService, type MyConnectorUsage } from '@/features/vanessa/services/vanessaKnowledgeService';

export default function PartnerSpacePage() {
    const [connector, setConnector] = useState<MyConnectorUsage | null | undefined>(undefined);

    useEffect(() => {
        vanessaKnowledgeService.getMyConnector().then(setConnector).catch(() => setConnector(null));
    }, []);

    const percent = connector && connector.tokensGranted > 0
        ? Math.min(100, Math.round((connector.tokensUsed / connector.tokensGranted) * 100))
        : null;

    return (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
            <div className="flex items-center gap-3">
                <Link to="/profil" className="text-gray-400 hover:text-gray-600">←</Link>
                <h1 className="text-xl font-bold text-gray-800">🤝 Espace partenaire</h1>
            </div>

            {connector === undefined ? (
                <p className="text-sm text-gray-400 text-center py-10">Chargement...</p>
            ) : connector === null ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-2">
                    <div className="text-3xl">🔒</div>
                    <p className="text-sm text-gray-500">
                        Aucun connecteur partenaire n'est associé à ton compte. Si tu penses que c'est une erreur,
                        contacte l'équipe Ça Parle.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <span
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                            style={{ backgroundColor: connector.color }}
                        >
                            {connector.icon}
                        </span>
                        <div>
                            <p className="text-base font-bold text-gray-800">{connector.name}</p>
                            <p className={`text-xs font-semibold ${connector.active ? 'text-green-600' : 'text-gray-400'}`}>
                                {connector.active ? '● Actif' : '● Inactif'}
                            </p>
                        </div>
                    </div>

                    {percent === null ? (
                        <div className="bg-green-50 rounded-2xl p-4 text-center">
                            <p className="text-sm font-semibold text-green-700">Accès illimité</p>
                            <p className="text-xs text-green-600 mt-1">Aucun quota de tokens n'est actuellement appliqué à ce connecteur.</p>
                        </div>
                    ) : (
                        <div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${percent >= 95 ? 'bg-red-500' : percent >= 90 ? 'bg-amber-400' : 'bg-[#FF4757]'}`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                                <span>{connector.tokensUsed.toLocaleString('fr-FR')} utilisés</span>
                                <span>{connector.tokensGranted.toLocaleString('fr-FR')} au total</span>
                            </div>
                            <p className="text-center text-sm font-semibold text-gray-700 mt-2">{percent}% consommé</p>

                            {percent >= 90 && (
                                <div className={`mt-3 rounded-xl p-3 text-xs text-center ${percent >= 95 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                                    {percent >= 100
                                        ? "Le quota est épuisé — Vanessa n'est plus disponible sur ce connecteur en attendant une recharge."
                                        : 'Le quota approche de sa limite — pense à contacter Ça Parle pour une recharge.'}
                                </div>
                            )}
                        </div>
                    )}

                    <p className="text-xs text-gray-400 text-center pt-2">
                        Pour recharger ou ajuster ton quota, contacte directement l'équipe Ça Parle.
                    </p>
                </div>
            )}
        </div>
    );
}
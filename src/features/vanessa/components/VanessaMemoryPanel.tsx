// src/features/vanessa/components/VanessaMemoryPanel.tsx — Vanessa
import { useState, useEffect } from 'react';
import { vanessaMemoryService, type VanessaMemoryEntry } from '../services/vanessaMemoryService';
import { Button } from '@/components/ui/button';

export const VanessaMemoryPanel = () => {
    const [memory, setMemory] = useState<VanessaMemoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            setMemory(await vanessaMemoryService.list());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (expanded) load();
    }, [expanded]);

    const handleDelete = async (id: string) => {
        setMemory((prev) => prev.filter((m) => m.$id !== id));
        try {
            await vanessaMemoryService.deleteOne(id);
        } catch {
            load(); // resynchronise en cas d'échec
        }
    };

    const handleClearAll = async () => {
        if (!confirm("Effacer tout ce que Vanessa se souvient de toi ? Elle continuera de discuter normalement, juste sans ces souvenirs.")) return;
        setClearing(true);
        try {
            await vanessaMemoryService.clearAll();
            setMemory([]);
        } finally {
            setClearing(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-left"
            >
                <div>
                    <p className="text-sm font-semibold text-gray-800">🧠 Ce que Vanessa se souvient de moi</p>
                    <p className="text-xs text-gray-400 mt-0.5">Des faits qu'elle retient d'une conversation à l'autre, pas l'historique complet.</p>
                </div>
                <span className="text-gray-300 text-sm">{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
                <div className="mt-4 space-y-2">
                    {loading ? (
                        <p className="text-sm text-gray-400">Chargement...</p>
                    ) : memory.length === 0 ? (
                        <p className="text-sm text-gray-400">Rien de retenu pour l'instant.</p>
                    ) : (
                        <>
                            {memory.map((m) => (
                                <div key={m.$id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2">
                                    <p className="text-sm text-gray-700">{m.content}</p>
                                    <button
                                        onClick={() => handleDelete(m.$id)}
                                        className="text-xs text-red-400 hover:text-red-600 shrink-0"
                                    >
                                        Oublier
                                    </button>
                                </div>
                            ))}
                            <Button size="sm" variant="ghost" onClick={handleClearAll} isLoading={clearing} className="mt-2">
                                Tout effacer
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
// src/features/console/hooks/useAlertSummary.ts — Vanessa
import { useState, useEffect } from 'react';
import { platformService } from '../services/platformService';

// Nombre d'alertes ouvertes (pas encore prises en compte), pour la pastille
// du menu. N'interroge le serveur que pour les modérateurs (`enabled`), et
// reste muet si la Function n'est pas encore déployée.
export function useAlertSummary(enabled: boolean, intervalMs = 120_000) {
    const [summary, setSummary] = useState({ open: 0, critical: 0 });

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        const load = () => {
            platformService.alertSummary()
                .then((s) => { if (!cancelled) setSummary({ open: s.open, critical: s.critical }); })
                .catch(() => { /* pas encore configuré : on n'affiche simplement rien */ });
        };
        load();
        const timer = setInterval(load, intervalMs);
        return () => { cancelled = true; clearInterval(timer); };
    }, [enabled, intervalMs]);

    return summary;
}
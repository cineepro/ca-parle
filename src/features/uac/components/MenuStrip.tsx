// src/features/uac/components/MenuStrip.tsx — Vanessa
// « Au menu aujourd'hui » : une carte par restaurant, qui se fait défiler au doigt. Le repas du moment est mis en avant.
import { useEffect, useState } from 'react';
import { uacService, type UacRestaurant } from '../services/uacService';
import { MEALS } from '../config';
import { currentMeal, dayLabel, todayKey } from '../lib/menu';

export const MenuStrip = () => {
    const [restaurants, setRestaurants] = useState<UacRestaurant[] | null>(null);
    const day = todayKey();
    const meal = currentMeal();

    useEffect(() => {
        uacService.listRestaurants().then(setRestaurants).catch(() => setRestaurants([]));
    }, []);

    const cards = (restaurants || []).filter((r) => MEALS.some((m) => r.menu[day][m.slug]));
    if (cards.length === 0) return null; // rien à afficher tant qu'aucun menu n'est saisi

    return (
        <section aria-label="Menu du jour des restaurants universitaires">
            <h2 className="px-4 text-sm font-bold text-ink">🍽️ Au menu aujourd’hui <span className="font-normal text-gray-500">· {dayLabel(day)}</span></h2>
            <div className="mt-2 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
                {cards.map((r) => (
                    <article key={r.id} className="snap-start shrink-0 w-[78%] max-w-[300px] rounded-2xl bg-white border border-gray-200 p-3.5">
                        <p className="text-sm font-bold text-ink truncate">{r.name}</p>
                        {r.place && <p className="text-xs text-gray-500 truncate">{r.place}</p>}
                        <ul className="mt-2 space-y-1.5">
                            {MEALS.map((m) => {
                                const dish = r.menu[day][m.slug];
                                const now = m.slug === meal;
                                return (
                                    <li key={m.slug} className={`flex gap-2 rounded-lg px-2 py-1 text-sm ${now ? 'bg-brand-tint text-ink font-semibold' : 'text-gray-700'}`}>
                                        <span aria-hidden="true">{m.icon}</span>
                                        <span className="shrink-0 w-14 text-xs text-gray-500 pt-0.5">{m.short}</span>
                                        <span className="min-w-0 break-words">{dish || '—'}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </article>
                ))}
            </div>
        </section>
    );
};

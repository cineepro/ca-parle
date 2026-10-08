// src/components/ui/badge.tsx — Vanessa
// Le sens ne passe jamais par la couleur seule : icône + libellé.
import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'danger' | 'warning' | 'info';

const toneClasses: Record<BadgeTone, string> = {
    neutral: 'bg-sand text-gray-700',
    brand: 'bg-brand-tint text-ochre',
    success: 'bg-green-50 text-green-700',
    danger: 'bg-red-50 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-sand text-brun',
};

interface BadgeProps {
    tone?: BadgeTone;
    icon?: ReactNode;
    children: ReactNode;
    className?: string;
}

export const Badge = ({ tone = 'neutral', icon, children, className = '' }: BadgeProps) => (
    <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClasses[tone]} ${className}`}
    >
        {icon}
        {children}
    </span>
);

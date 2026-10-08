// src/features/references/components/ReferenceTypeIcon.tsx — Vanessa
import { User, Calendar, MapPin, Building2, Tag, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
    personne: User, evenement: Calendar, lieu: MapPin, entreprise: Building2, sujet: Tag,
};

export const ReferenceTypeIcon = ({ type }: { type: string }) => {
    const Icon = ICONS[type] || Tag;
    return <Icon className="inline-block w-[1.1em] h-[1.1em] align-[-0.18em] mr-1 shrink-0" aria-hidden="true" />;
};

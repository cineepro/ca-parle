// src/features/references/components/ReferenceChip.tsx — Vanessa
import { Link } from 'react-router-dom';
import type { Reference, ReferenceType } from '../services/referenceService';
import { ReferenceTypeIcon } from './ReferenceTypeIcon';

export const ReferenceChip = ({ reference }: { reference: Reference }) => (
    <Link
        to={`/reference/${reference.slug}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
    >
        <ReferenceTypeIcon type={reference.type} /> {reference.name}
    </Link>
);

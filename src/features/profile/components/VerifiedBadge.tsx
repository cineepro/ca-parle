// src/features/profile/components/VerifiedBadge.tsx — Vanessa
// Badge bleu des comptes certifiés.
export const VerifiedBadge = ({ className = '' }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        role="img"
        aria-label="Compte certifié"
        className={`inline-block w-[1.1em] h-[1.1em] align-[-0.2em] shrink-0 ${className}`}
    >
        <title>Compte certifié</title>
        <path
            fill="#1D9BF0"
            d="M12 1.8l2.5 1.9 3.1-.2 1.2 2.9 2.8 1.4-.5 3.1 1.5 2.7-2.1 2.3.1 3.1-3 .9-1.7 2.6-2.9-1.1-2.9 1.1-1.7-2.6-3-.9.1-3.1L1.5 13.7 3 11l-.5-3.1 2.8-1.4 1.2-2.9 3.1.2z"
        />
        <path d="M8 12.3l2.7 2.7L16.2 9.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

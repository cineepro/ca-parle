// src/features/messaging/components/LinkifiedText.tsx — Vanessa
// Affiche un texte de message en rendant cliquables les liens, adresses
// email et numéros de téléphone (voir utils/linkify.ts pour les règles).
import { useMemo } from 'react';
import { tokenizeLinks } from '../utils/linkify';

const OWN_HOST = typeof window !== 'undefined' ? window.location.hostname : '';

export const LinkifiedText = ({ text, isMine }: { text: string; isMine: boolean }) => {
    const tokens = useMemo(() => tokenizeLinks(text, { ownHost: OWN_HOST }), [text]);

    const linkClass = isMine
        ? 'underline underline-offset-2 decoration-ink/50 hover:decoration-ink break-all'
        : 'text-ochre underline underline-offset-2 decoration-ochre/40 hover:decoration-ochre break-all';

    return (
        <>
            {tokens.map((token, i) => {
                if (token.kind === 'text') return <span key={i}>{token.value}</span>;
                // Un lien interne (même site) s'ouvre dans l'onglet courant ;
                // un lien externe dans un nouvel onglet, sans donner accès à
                // la page d'origine (noopener) ni transmettre de référent.
                const isExternalWeb = token.kind === 'url' && token.external;
                return (
                    <a
                        key={i}
                        href={token.href}
                        target={isExternalWeb ? '_blank' : undefined}
                        rel={isExternalWeb ? 'noopener noreferrer nofollow' : undefined}
                        onClick={(e) => e.stopPropagation()}
                        className={linkClass}
                    >
                        {token.value}
                    </a>
                );
            })}
        </>
    );
};
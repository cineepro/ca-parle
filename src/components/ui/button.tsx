// src/components/ui/button.tsx — Vanessa (identité "Pull moutarde")
// Règle d'or : le jaune ne porte jamais de texte blanc → text-ink sur bg-brand.
import { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        'bg-brand text-ink hover:bg-brand-hover active:bg-brand-hover disabled:bg-brand-strong disabled:text-ink/50 shadow-sm',
    secondary:
        'bg-brun text-white hover:bg-[#6F4130] disabled:opacity-50',
    ghost:
        'bg-transparent text-ochre hover:bg-brand-tint disabled:opacity-50',
    danger:
        'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'min-h-[36px] px-4 py-1.5 text-sm',
    md: 'min-h-[44px] px-5 py-2.5 text-sm',
    lg: 'min-h-[48px] px-6 py-3 text-base',
};

/** Classes d'un bouton, pour les <Link> / <a> qui doivent y ressembler. */
export const buttonClasses = (
    variant: ButtonVariant = 'primary',
    size: ButtonSize = 'md',
    extra = ''
) =>
    `inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${extra}`;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            isLoading = false,
            fullWidth = false,
            disabled,
            className = '',
            children,
            type = 'button',
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                type={type}
                disabled={disabled || isLoading}
                aria-busy={isLoading || undefined}
                className={buttonClasses(variant, size, `${fullWidth ? 'w-full' : ''} ${className}`)}
                {...props}
            >
                {isLoading && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

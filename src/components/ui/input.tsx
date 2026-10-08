// src/components/ui/input.tsx — Vanessa
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const inputClasses =
    'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-gray-400 focus:outline-none focus:border-ink focus:ring-2 focus:ring-brand transition-colors disabled:bg-sand disabled:text-gray-500';

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', id, ...props }, ref) => {
        const inputId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error && inputId ? `${inputId}-error` : undefined}
                    className={`${inputClasses} ${error ? 'border-red-600' : ''} ${className}`}
                    {...props}
                />
                {error && (
                    <p id={inputId ? `${inputId}-error` : undefined} className="mt-1.5 text-sm text-red-600">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

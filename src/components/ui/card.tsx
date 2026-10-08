// src/components/ui/card.tsx — Vanessa
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
    padded?: boolean;
}

export const Card = ({ interactive = false, padded = true, className = '', children, ...props }: CardProps) => (
    <div
        className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${padded ? 'p-4' : ''} ${
            interactive ? 'transition-shadow hover:shadow-md cursor-pointer' : ''
        } ${className}`}
        {...props}
    >
        {children}
    </div>
);

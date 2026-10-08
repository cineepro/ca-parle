// src/components/ui/modal.tsx — Vanessa
// Fenêtre accessible : role=dialog, Échap, verrou de défilement, feuille du bas sur mobile.
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    className?: string;
}

export const Modal = ({ open, onClose, title, children, className = '' }: ModalProps) => {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        panelRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 sm:p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={`w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl focus:outline-none ${className}`}
            >
                {title && (
                    <div className="flex items-center justify-between gap-3 px-5 pt-5">
                        <h2 className="text-xl font-semibold text-ink">{title}</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Fermer"
                            className="rounded-full p-2 text-gray-600 hover:bg-sand"
                        >
                            <X className="w-5 h-5" aria-hidden="true" />
                        </button>
                    </div>
                )}
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
};

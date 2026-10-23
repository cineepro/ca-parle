// src/features/moteur/components/ZemRider.tsx — Zem
// Le logo de Zem (le motard). Tailles : 96 px (petit), 420 px (grand) — fichiers dans public/zem/.
interface Props {
    size?: 'sm' | 'lg';
    className?: string;
    bob?: boolean; // petit rebond à l'arrêt
}

export const ZemRider = ({ size = 'sm', className = '', bob = false }: Props) => (
    <img
        src={size === 'lg' ? '/zem/zem-420.png' : '/zem/zem-96.png'}
        alt="Zem, le motard qui t’amène partout"
        draggable={false}
        className={`select-none ${bob ? 'zem-bob' : ''} ${className}`}
    />
);

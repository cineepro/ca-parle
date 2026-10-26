// src/features/profile/lib/imageResize.ts — Vanessa
// Recadre l'image au carré et la réduit à 384 px avant l'envoi : photo légère,
// et la photo d'origine (souvent plusieurs Mo, avec position GPS) ne part jamais.
const SIZE = 384;

export async function resizeAvatar(file: File): Promise<File> {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        throw new Error('Choisis une image JPG, PNG ou WebP.');
    }
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) throw new Error("Impossible de lire cette image.");
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Traitement de l\'image impossible.');
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Traitement de l\'image impossible.');
    return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
}

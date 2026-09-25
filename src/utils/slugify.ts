// src/utils/slugify.ts — Vanessa
export function slugify(text: string): string {
    const base = text
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // accents
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);

    // Suffixe court pour limiter les collisions (le slug n'est pas la
    // seule clé, l'$id du document reste l'identifiant fiable).
    const suffix = Math.random().toString(36).slice(2, 7);
    return base ? `${base}-${suffix}` : suffix;
}

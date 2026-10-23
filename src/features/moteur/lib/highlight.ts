// src/features/moteur/lib/highlight.ts — Zem
// Coupe un extrait en morceaux « surlignés / normaux » pour les mots cherchés,
// sans tenir compte des accents ni des majuscules (« universite » surligne « Université »).
export interface Piece { text: string; hit: boolean }

const base = (c: string) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function highlightPieces(text: string, words: string[]): Piece[] {
    const chars = Array.from(text);
    const flat = chars.map((c) => base(c)[0] ?? c).join('');
    const marked = new Array(chars.length).fill(false);
    for (const w of words) {
        const needle = base(w);
        if (needle.length < 2) continue;
        let i = flat.indexOf(needle);
        while (i !== -1) {
            for (let k = i; k < i + needle.length; k++) marked[k] = true;
            i = flat.indexOf(needle, i + needle.length);
        }
    }
    const out: Piece[] = [];
    chars.forEach((c, i) => {
        const last = out[out.length - 1];
        if (last && last.hit === marked[i]) last.text += c;
        else out.push({ text: c, hit: marked[i] });
    });
    return out;
}

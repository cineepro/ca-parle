// src/features/uac/lib/links.ts — Vanessa
// Liste collée par le modérateur : un nom, puis sur la ligne suivante son lien Google Maps (ou ses coordonnées).
//   Amphi A-500
//   https://goo.gl/maps/xxxx
// On accepte aussi « Nom : lien » sur une seule ligne, et des lignes vides entre les lieux.
import type { PlaceKind } from '../config';

export interface LinkItem {
    key: string;
    name: string;
    url?: string;
    latitude?: number;
    longitude?: number;
}

const URL_RE = /https?:\/\/\S+/i;
const COORDS_RE = /^\s*(-?\d{1,3}\.\d+)\s*[,;]\s*(-?\d{1,3}\.\d+)\s*$/;

export function parseLinkList(text: string): LinkItem[] {
    const items: LinkItem[] = [];
    let pendingName = '';
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;
        const url = line.match(URL_RE);
        const coords = line.match(COORDS_RE);
        if (url) {
            const before = line.slice(0, url.index).replace(/[:\-–—]+\s*$/, '').trim();
            const name = before || pendingName;
            if (name) items.push({ key: `l${items.length}`, name, url: url[0] });
            pendingName = '';
        } else if (coords && pendingName) {
            items.push({ key: `l${items.length}`, name: pendingName, latitude: Number(coords[1]), longitude: Number(coords[2]) });
            pendingName = '';
        } else {
            pendingName = line.replace(/\s+/g, ' ');
        }
    }
    return items;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Devine le type à partir du nom ; le modérateur peut toujours le corriger avant d'enregistrer.
export function guessKind(name: string): PlaceKind {
    const n = norm(name);
    if (/resto|restaurant|cantine|maquis/.test(n)) return 'restauration';
    if (/centre commercial|boutique|marche|librairie|supermarche/.test(n)) return 'commerce';
    if (/banque|ecobank|\bboa\b|bank/.test(n)) return 'banque';
    if (/bibliotheque|\bbu\b/.test(n)) return 'bibliotheque';
    if (/infirmerie|pharmacie|clinique|sante|dispensaire/.test(n)) return 'sante';
    if (/stade|terrain|sport|gymnase/.test(n)) return 'sport';
    if (/rectorat|dacanat|decanat|doyen|scolarite|administration|direction/.test(n)) return 'administration';
    if (/amphi|faculte|\bfsa\b|\bfast\b|\bfga\b|ifri|enam|epac|ilaci|eace|departement|master|ecole|institut/.test(n)) return 'amphi';
    return 'autre';
}

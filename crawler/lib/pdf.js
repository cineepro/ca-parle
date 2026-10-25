// crawler/lib/pdf.js — Zem
// Lecture du texte d'un PDF (communiqués de bourses, avis de concours…). Pur : reçoit les octets.
// Un PDF « scanné » (une photo de page, sans texte) ne donne rien : il est ignoré, Zem ne fait pas d'OCR.
import { extractText, getDocumentProxy } from 'unpdf';
import { MAX_CONTENT_CHARS, MIN_CONTENT_CHARS } from './extract.js';

export const MAX_PDF_BYTES = 8_000_000;

const clean = (s) => String(s || '').replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

// « D:20260610093000+01'00' » → date ISO (ou '')
export function parsePdfDate(v) {
    const m = String(v || '').match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
    if (!m) return '';
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4] || '00'}:${m[5] || '00'}:${m[6] || '00'}Z`;
    return Number.isNaN(Date.parse(iso)) ? '' : new Date(iso).toISOString();
}

const titleFromUrl = (url) => {
    try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || '').replace(/\.pdf$/i, '').replace(/[-_+]+/g, ' ').trim(); } catch { return ''; }
};

// Renvoie null si le PDF n'a pas assez de texte.
export async function extractPdf(bytes, url, linkText = '') {
    const head = Buffer.from(bytes.slice(0, 5)).toString('latin1');
    if (!head.startsWith('%PDF')) return null;
    let pdf;
    try { pdf = await getDocumentProxy(new Uint8Array(bytes)); } catch { return null; }
    let info = {};
    try { info = (await pdf.getMetadata())?.info || {}; } catch { /* pas de métadonnées */ }
    let text = '';
    try { text = (await extractText(pdf, { mergePages: true })).text; } catch { return null; }
    const content = clean(Array.isArray(text) ? text.join('\n') : text).slice(0, MAX_CONTENT_CHARS);
    if (content.length < MIN_CONTENT_CHARS) return null;
    const metaTitle = clean(info.Title);
    const firstLine = content.split('\n').find((l) => l.trim().length >= 8) || '';
    const title = (metaTitle.length >= 6 ? metaTitle : clean(linkText).length >= 6 ? clean(linkText) : (firstLine.length >= 8 ? firstLine : titleFromUrl(url))).slice(0, 200);
    return { title, description: content.replace(/\n/g, ' ').slice(0, 300), content, publishedAt: parsePdfDate(info.CreationDate), pages: pdf.numPages };
}

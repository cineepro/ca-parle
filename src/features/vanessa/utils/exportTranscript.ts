// src/features/vanessa/utils/exportTranscript.ts — Vanessa
// Téléchargement de la discussion d'une émission, en PDF ou en Word (.docx).
// Les deux bibliothèques (jspdf, docx) sont chargées À LA DEMANDE, au moment du clic :
// elles n'alourdissent donc pas le reste de l'application.
import { databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/auth';
import { Query, type Models } from 'appwrite';

export type ExportFormat = 'pdf' | 'docx';

export interface TranscriptMeta {
    title: string;
    guestName?: string;
    topic?: string;
    posture?: string;
    /** Date de l'émission (ISO). */
    date?: string;
}

export interface TranscriptLine {
    speaker: 'vanessa' | 'guest';
    /** ISO */
    time: string;
    text: string;
}

interface RawMessage {
    senderId: string;
    content?: string;
    type?: string;
    createdAt?: string;
    $createdAt?: string;
}

/** Messages d'une conversation → lignes de transcription (ordre chronologique). */
export function messagesToLines(messages: RawMessage[], vanessaId: string): TranscriptLine[] {
    return messages
        .map((m) => {
            const text = (m.content || '').trim() || (m.type === 'audio' ? '(message vocal)' : m.type === 'image' ? '(photo)' : '');
            return {
                speaker: (m.senderId === vanessaId ? 'vanessa' : 'guest') as TranscriptLine['speaker'],
                time: m.createdAt || m.$createdAt || '',
                text,
            };
        })
        .filter((l) => l.text)
        .sort((a, b) => a.time.localeCompare(b.time));
}

/** Tous les messages d'une conversation (par pages de 100 — une émission peut être longue). */
export async function fetchAllMessages(conversationId: string): Promise<RawMessage[]> {
    const all: RawMessage[] = [];
    let cursor: string | null = null;
    // Garde-fou : 100 pages × 100 = 10 000 messages maximum.
    for (let page = 0; page < 100; page++) {
        const queries: string[] = [
            Query.equal('conversationId', conversationId),
            Query.orderAsc('createdAt'),
            Query.limit(100),
            ...(cursor ? [Query.cursorAfter(cursor)] : []),
        ];
        const result: Models.DocumentList<Models.Document> = await databases.listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, queries);
        all.push(...(result.documents as unknown as RawMessage[]));
        if (result.documents.length < 100) break;
        cursor = result.documents[result.documents.length - 1].$id;
    }
    return all;
}

const speakerLabel = (line: TranscriptLine, meta: TranscriptMeta) =>
    line.speaker === 'vanessa' ? 'Vanessa' : (meta.guestName?.trim() || 'Invité');

const formatTime = (iso: string) =>
    iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

const formatLongDate = (iso?: string) =>
    new Date(iso || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const stripTitleEmoji = (title: string) => title.replace(/^🎙️\s*/, '').trim();

export function transcriptFileName(meta: TranscriptMeta, format: ExportFormat): string {
    const slug = stripTitleEmoji(meta.title)
        .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'emission';
    const day = new Date(meta.date || Date.now()).toISOString().slice(0, 10);
    return `emission-${slug}-${day}.${format}`;
}

// ---------- PDF ----------
// Les polices PDF standard ne connaissent que l'alphabet latin (WinAnsi) : accents, « », œ,
// € passent ; les emojis et symboles exotiques sont retirés pour ne pas apparaître en
// caractères illisibles.
export function sanitizeForPdf(text: string): string {
    return text
        .normalize('NFC')
        .replace(/[    ]/g, ' ')
        .replace(/[‐-‒−]/g, '-')
        .replace(/\p{Extended_Pictographic}|[️‍​]/gu, '')
        // eslint-disable-next-line no-control-regex
        .replace(/[^\u0009\u000A -ÿŒœŠšŸŽžƒˆ˜–—‘-‚“-„†-•…‰‹›€™]/g, '');
}

async function buildPdf(meta: TranscriptMeta, lines: TranscriptLine[]): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxW = pageW - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
        if (y + needed > pageH - margin) {
            doc.addPage();
            y = margin;
        }
    };
    const writeWrapped = (text: string, size: number, lineH: number, style: 'normal' | 'bold' | 'italic', color: [number, number, number]) => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        const wrapped: string[] = doc.splitTextToSize(sanitizeForPdf(text), maxW);
        for (const row of wrapped) {
            ensureSpace(lineH);
            doc.text(row, margin, y);
            y += lineH;
        }
    };

    writeWrapped(stripTitleEmoji(meta.title) || 'Émission', 18, 8, 'bold', [30, 30, 30]);
    y += 1;
    const metaRows = [
        `Date : ${formatLongDate(meta.date)}`,
        meta.guestName ? `Invité : ${meta.guestName}` : '',
        meta.topic ? `Sujet : ${meta.topic}` : '',
        meta.posture ? `Posture : ${meta.posture}` : '',
    ].filter(Boolean);
    for (const row of metaRows) writeWrapped(row, 10, 5, 'normal', [110, 110, 110]);
    y += 2;
    doc.setDrawColor(210, 210, 210);
    doc.line(margin, y, pageW - margin, y);
    y += 7;

    if (lines.length === 0) {
        writeWrapped('Aucun échange à afficher pour cette émission.', 11, 6, 'italic', [140, 140, 140]);
    }
    for (const line of lines) {
        ensureSpace(14);
        const isVanessa = line.speaker === 'vanessa';
        const time = formatTime(line.time);
        writeWrapped(`${speakerLabel(line, meta)}${time ? `  ·  ${time}` : ''}`, 10, 5, 'bold', isVanessa ? [184, 120, 0] : [60, 60, 60]);
        writeWrapped(line.text, 11, 5.6, 'normal', [30, 30, 30]);
        y += 4;
    }

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(160, 160, 160);
        doc.text(`Page ${i} / ${pages}`, pageW / 2, pageH - 10, { align: 'center' });
    }

    return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
}

// ---------- Word ----------
async function buildDocx(meta: TranscriptMeta, lines: TranscriptLine[]): Promise<Blob> {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

    // Un saut de ligne dans un message = un vrai saut de ligne Word (pas une seule ligne collée).
    const textRuns = (text: string, opts: { color?: string; italics?: boolean } = {}) =>
        text.split('\n').map((row, i) => new TextRun({ text: row, break: i > 0 ? 1 : 0, size: 22, ...opts }));

    const children: InstanceType<typeof Paragraph>[] = [
        new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: stripTitleEmoji(meta.title) || 'Émission', bold: true })] }),
    ];
    const metaRows = [
        `Date : ${formatLongDate(meta.date)}`,
        meta.guestName ? `Invité : ${meta.guestName}` : '',
        meta.topic ? `Sujet : ${meta.topic}` : '',
        meta.posture ? `Posture : ${meta.posture}` : '',
    ].filter(Boolean);
    for (const row of metaRows) {
        children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: row, color: '6E6E6E', size: 20 })] }));
    }
    children.push(new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: 'single', size: 6, color: 'D2D2D2', space: 6 } }, children: [] }));

    if (lines.length === 0) {
        children.push(new Paragraph({ children: textRuns('Aucun échange à afficher pour cette émission.', { italics: true, color: '8C8C8C' }) }));
    }
    for (const line of lines) {
        const isVanessa = line.speaker === 'vanessa';
        const time = formatTime(line.time);
        children.push(
            new Paragraph({
                keepNext: true,
                spacing: { before: 160, after: 40 },
                children: [new TextRun({ text: `${speakerLabel(line, meta)}${time ? `  ·  ${time}` : ''}`, bold: true, size: 20, color: isVanessa ? 'B87800' : '3C3C3C' })],
            }),
            new Paragraph({ spacing: { after: 80 }, children: textRuns(line.text) }),
        );
    }

    const doc = new Document({
        creator: 'Vanessa',
        title: stripTitleEmoji(meta.title) || 'Émission',
        sections: [{ children }],
    });
    const buffer = await Packer.toArrayBuffer(doc);
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export async function buildTranscriptBlob(format: ExportFormat, meta: TranscriptMeta, lines: TranscriptLine[]): Promise<Blob> {
    return format === 'pdf' ? buildPdf(meta, lines) : buildDocx(meta, lines);
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Laisse le navigateur démarrer le téléchargement avant de libérer l'adresse.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Tout-en-un : récupère les messages (si besoin), construit le fichier et le télécharge. */
export async function exportEmissionTranscript(opts: {
    format: ExportFormat;
    meta: TranscriptMeta;
    vanessaId: string;
    conversationId: string;
    /** Messages déjà chargés si on les a ; sinon ils sont relus en entier. */
    messages?: RawMessage[];
}): Promise<void> {
    // Relecture complète : la page n'affiche que les derniers messages chargés.
    const raw = await fetchAllMessages(opts.conversationId).catch(() => opts.messages || []);
    const lines = messagesToLines(raw.length > 0 ? raw : (opts.messages || []), opts.vanessaId);
    const blob = await buildTranscriptBlob(opts.format, opts.meta, lines);
    downloadBlob(blob, transcriptFileName(opts.meta, opts.format));
}
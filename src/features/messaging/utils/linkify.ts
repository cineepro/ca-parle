// src/features/messaging/utils/linkify.ts — Vanessa
// Découpe un texte de message en morceaux : texte simple, lien, email,
// numéro de téléphone — pour rendre les trois derniers cliquables, comme
// sur WhatsApp ou Facebook. Fonction pure (aucune dépendance au navigateur),
// donc testable seule.
//
// Volontairement SANS lookbehind regex (`(?<!...)`) : les iPhone sous iOS
// < 16.4 refusent de compiler une telle expression et feraient planter la
// page entière. Les vérifications de "début de mot" se font à la main.

export type LinkToken =
    | { kind: 'text'; value: string }
    | { kind: 'url'; value: string; href: string; external: boolean }
    | { kind: 'email'; value: string; href: string }
    | { kind: 'phone'; value: string; href: string };

// Extensions reconnues pour une adresse SANS "http" (ex : "abmsbj.org/faq").
// Liste volontairement limitée : accepter n'importe quelle extension
// transformerait en lien des fautes de frappe comme "fini.Merci".
const TLDS = 'com|org|net|bj|fr|io|co|me|app|info|gov|edu|tv|dev|ly|be|ch|ca|uk|us|africa|eu|xyz|link|sn|ci|tg|ng|gh|ne|bf|ml|cm|gn|ga|cd|cg';

const SOURCE = [
    // 1. email (avant les adresses web, pour ne pas couper "x@abmsbj.org")
    `(?<email>[a-z0-9._%+\\-]+@[a-z0-9\\-]+(?:\\.[a-z0-9\\-]+)*\\.[a-z]{2,})`,
    // 2. adresse avec http(s)
    `(?<scheme>https?:\\/\\/[^\\s<>"'\`]+)`,
    // 3. adresse en www.
    `(?<www>www\\.[^\\s<>"'\`]+)`,
    // 4. adresse nue (nom de domaine + extension connue + chemin éventuel)
    `(?<bare>(?:[a-z0-9](?:[a-z0-9\\-]*[a-z0-9])?\\.)+(?:${TLDS})\\b(?:\\/[^\\s<>"'\`]*)?)`,
    // 5. téléphone international : +229 01 53 28 73 36
    `(?<intl>\\+\\d[\\d\\s.\\-()]{6,18}\\d)`,
    // 6. téléphone local commençant par 0 : 0153287336, 01 53 28 73 36
    `(?<local>0(?:[\\s.\\-]?\\d){7,13})`,
    // 7. ancien format béninois à 8 chiffres en 4 groupes : 97 00 11 22
    `(?<grouped>\\d{2}(?:[\\s.\\-]\\d{2}){3})`,
].join('|');

const TRAILING = /[.,;:!?)\]}'"»…]+$/;

function trimTrailing(value: string): string {
    let v = value;
    for (;;) {
        const m = v.match(TRAILING);
        if (!m) return v;
        const cut = m[0];
        // Une parenthèse fermante finale fait partie du lien seulement si
        // elle ferme une parenthèse ouverte DANS le lien (ex : Wikipédia).
        if (cut.startsWith(')')) {
            const opens = (v.match(/\(/g) || []).length;
            const closes = (v.match(/\)/g) || []).length;
            if (closes <= opens) return v;
            v = v.slice(0, -1);
            continue;
        }
        v = v.slice(0, v.length - cut.length);
    }
}

const isWordChar = (c: string | undefined) => !!c && /[A-Za-z0-9_@.\-/]/.test(c);

function looksLikeDate(s: string): boolean {
    return /^\d{1,2}[\s.\-/]\d{1,2}[\s.\-/]\d{2,4}$/.test(s.trim());
}

function digitsOf(s: string): string {
    return s.replace(/\D/g, '');
}

export function tokenizeLinks(text: string, options: { ownHost?: string } = {}): LinkToken[] {
    const tokens: LinkToken[] = [];
    if (!text) return tokens;

    const regex = new RegExp(SOURCE, 'gi');
    let cursor = 0;
    let match: RegExpExecArray | null;

    const pushText = (end: number) => {
        if (end > cursor) tokens.push({ kind: 'text', value: text.slice(cursor, end) });
    };

    while ((match = regex.exec(text)) !== null) {
        const groups = match.groups || {};
        let raw = match[0];
        const start = match.index;
        const prev = text[start - 1];

        let kind: 'email' | 'url' | 'phone' | null = null;
        let href = '';
        let external = false;

        if (groups.email) {
            kind = 'email';
            raw = trimTrailing(raw);
            href = `mailto:${raw}`;
        } else if (groups.scheme || groups.www || groups.bare) {
            // Une adresse nue collée à un mot ("exemple.contact.com") ou
            // précédée d'un @ ne doit pas être prise pour un début d'adresse.
            if (groups.bare && isWordChar(prev)) {
                regex.lastIndex = start + 1;
                continue;
            }
            raw = trimTrailing(raw);
            if (groups.bare && !/[a-z]/i.test(raw)) {
                regex.lastIndex = start + 1;
                continue;
            }
            kind = 'url';
            href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
            try {
                const host = new URL(href).hostname.replace(/^www\./, '');
                const own = (options.ownHost || '').replace(/^www\./, '');
                external = !own || host !== own;
            } catch {
                regex.lastIndex = start + 1;
                continue;
            }
        } else {
            // Numéros : refusés s'ils sont collés à un autre chiffre/mot.
            if (isWordChar(prev) && !groups.intl) {
                regex.lastIndex = start + 1;
                continue;
            }
            if (groups.intl && prev && /[0-9A-Za-z]/.test(prev)) {
                regex.lastIndex = start + 1;
                continue;
            }
            raw = raw.replace(/[\s.\-]+$/, '');
            const digits = digitsOf(raw);
            const next = text[start + match[0].length];
            if (digits.length < 8 || digits.length > 15 || looksLikeDate(raw) || (next && /\d/.test(next))) {
                regex.lastIndex = start + 1;
                continue;
            }
            kind = 'phone';
            href = `tel:${raw.trim().startsWith('+') ? '+' : ''}${digits}`;
        }

        if (!kind) continue;
        pushText(start);
        if (kind === 'url') tokens.push({ kind, value: raw, href, external });
        else tokens.push({ kind, value: raw, href });
        cursor = start + raw.length;
        regex.lastIndex = cursor;
    }

    pushText(text.length);
    return tokens;
}
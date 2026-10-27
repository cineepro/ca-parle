// functions/halte-alert/src/logic.js — HALTE
// Règles pures (testables sans Appwrite). PRINCIPE : on ne refuse JAMAIS une personne qui demande de l'aide.
// Les protections contre les fausses alertes servent à TRIER (priorité, regroupement des doublons,
// signaux pour la personne qui rappelle), pas à bloquer. Seul un robot évident est écarté.
import { createHash, randomInt } from 'node:crypto';

export const STATUSES = ['nouvelle', 'en_cours', 'traitee', 'sans_suite', 'test'];
export const OPEN_STATUSES = ['nouvelle', 'en_cours'];
export const FOR_WHO = ['self', 'other', 'unknown'];
export const LIMITS = { place: 300, message: 1000, phone: 30, posterCode: 40, bestTime: 40, geo: 60 };

// Pas de lettres ambiguës (0/O, 1/I) : la référence est parfois dictée au téléphone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeRef() {
    let s = '';
    for (let i = 0; i < 6; i += 1) s += ALPHABET[randomInt(ALPHABET.length)];
    return `HV-${s}`;
}

// Message vocal : 2 minutes au plus. Le type du fichier est reconnu d'après son CONTENU, jamais d'après ce que dit le client.
export const AUDIO = { maxBytes: 1_500_000, maxSeconds: 125, maxPerAlert: 5 };

/** Reconnaît un fichier audio par ses premiers octets. Renvoie { ext, mime } ou null (alors : refusé). */
export function sniffAudio(buf) {
    if (!buf || buf.length < 12) return null;
    const ascii = (a, b) => buf.subarray(a, b).toString('latin1');
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { ext: 'webm', mime: 'audio/webm' };
    if (ascii(0, 4) === 'OggS') return { ext: 'ogg', mime: 'audio/ogg' };
    if (ascii(4, 8) === 'ftyp') return { ext: 'm4a', mime: 'audio/mp4' };
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return { ext: 'wav', mime: 'audio/wav' };
    if (ascii(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return { ext: 'mp3', mime: 'audio/mpeg' };
    return null;
}

/** { data: base64, seconds } envoyé par la page → { buffer, ext, mime, seconds } ou { error }. Absent → { none: true }. */
export function cleanAudio(raw) {
    if (!raw || typeof raw !== 'object' || !raw.data) return { none: true };
    const data = String(raw.data).replace(/^data:[^,]*,/, '');
    if (data.length > Math.ceil((AUDIO.maxBytes * 4) / 3) + 8) return { error: 'Le message vocal est trop long. Réessaie avec un message plus court.' };
    const buffer = Buffer.from(data, 'base64');
    if (!buffer.length || buffer.length > AUDIO.maxBytes) return { error: 'Le message vocal est trop long. Réessaie avec un message plus court.' };
    const kind = sniffAudio(buffer);
    if (!kind) return { error: "Ce message vocal n'a pas pu être lu. Réessaie, ou écris quelques mots." };
    const seconds = Math.max(0, Math.min(AUDIO.maxSeconds, Math.round(Number(raw.seconds) || 0)));
    return { buffer, ext: kind.ext, mime: kind.mime, seconds };
}

export const audioIdsOf = (doc) => String(doc?.audioIds || '').split(',').filter(Boolean);

export const cut = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Numéro tel que saisi → chiffres et « + » seulement (sert à repérer un même numéro). */
export function normalizePhone(raw) {
    const p = String(raw ?? '').replace(/[^\d+]/g, '');
    if (!p) return '';
    const digits = p.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return '';
    // Les numéros béninois ont 8 ou 10 chiffres (depuis 2024, préfixe 01) ; on compare sur les 8 derniers.
    return p.startsWith('+') ? `+${digits}` : digits;
}
export const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-8);

export function deviceHash(salt, ip, userAgent) {
    if (!ip) return ''; // sans adresse connue, aucune limite par appareil (on ne punit pas tout un village)
    return createHash('sha256').update(`${salt}|${ip}|${userAgent || ''}`).digest('hex');
}

/** Données envoyées par la page publique → fiche propre (ou erreur lisible). */
export function cleanSubmission(body) {
    const forWho = FOR_WHO.includes(body.forWho) ? body.forWho : 'unknown';
    const phone = normalizePhone(body.phone);
    const geo = /^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?(,\d+(\.\d+)?)?$/.test(String(body.geo || '')) ? String(body.geo) : '';
    const out = {
        forWho,
        danger: body.danger === true,
        place: cut(body.place, LIMITS.place),
        geo,
        phone,
        callOk: body.callOk === true && !!phone,
        bestTime: cut(body.bestTime, LIMITS.bestTime),
        message: String(body.message ?? '').replace(/\r\n/g, '\n').trim().slice(0, LIMITS.message),
        posterCode: cut(body.posterCode, LIMITS.posterCode).replace(/[^A-Za-z0-9_-]/g, ''),
        channel: body.channel === 'relais' ? 'relais' : 'web',
        honeypot: cut(body.website, 50),
        fillMs: Number.isFinite(Number(body.fillMs)) ? Number(body.fillMs) : null,
    };
    const audio = cleanAudio(body.audio);
    if (audio.error) return { error: audio.error };
    out.audio = audio.none ? null : audio;
    if (!out.phone && !out.place && !out.geo && !out.message && !out.audio) {
        return { error: 'Dis-nous au moins où tu es, ou comment te joindre, ou écris quelques mots, ou parle dans le micro.' };
    }
    return { value: out };
}

/**
 * Trie une alerte. ctx : { deviceLastHour, deviceLastDay, samePhoneOpen } (compteurs déjà lus en base).
 * Renvoie { priority, flags, merge, drop }.
 *  - danger immédiat : toujours « urgent », jamais limité ni regroupé.
 *  - même numéro déjà en attente : on COMPLÈTE la fiche existante au lieu d'en créer une autre.
 *  - rafale depuis un même appareil : « basse » et signalée, mais conservée.
 */
export function triage(sub, ctx = {}) {
    const flags = [];
    if (sub.honeypot) return { priority: 'basse', flags: ['robot'], merge: null, drop: true };
    if (sub.fillMs !== null && sub.fillMs < 1500) flags.push('rapide');
    if (sub.audio) flags.push('vocal'); // le numéro et le lieu sont peut-être dits à voix haute : à écouter
    if (!sub.phone && !sub.callOk && !sub.audio) flags.push('sans_contact');
    if (sub.danger) return { priority: 'urgent', flags, merge: null, drop: false };

    if (ctx.samePhoneOpen) return { priority: 'normale', flags: [...flags, 'doublon'], merge: ctx.samePhoneOpen, drop: false };
    const burst = (ctx.deviceLastHour || 0) >= 3 || (ctx.deviceLastDay || 0) >= 8;
    if (burst) flags.push('rafale');
    if (burst || flags.includes('sans_contact') && !sub.place && !sub.geo) return { priority: 'basse', flags, merge: null, drop: false };
    return { priority: 'normale', flags, merge: null, drop: false };
}

/** « HALTE EKPE-03 je suis en danger » → { posterCode, message }. */
export function parseSms(text) {
    const m = /^\s*halte\b[\s:,-]*([A-Za-z0-9_-]{2,30})?\s*(.*)$/is.exec(String(text || ''));
    if (!m) return null;
    let code = m[1] || '';
    let message = (m[2] || '').trim();
    // « HALTE au secours » : le premier mot n'était pas un code d'affiche mais le début du message.
    if (code && !/\d|[-_]/.test(code) && code === code.toLowerCase()) { message = `${code} ${message}`.trim(); code = ''; }
    return { posterCode: code.toUpperCase(), message: message.slice(0, LIMITS.message) };
}
export const smsLooksUrgent = (t) => /\b(urgent|urgence|danger|maintenant|au secours|aide[- ]moi)\b/i.test(String(t || ''));

export function appendNote(notesJson, entry) {
    let list = [];
    try { list = JSON.parse(notesJson || '[]'); } catch { list = []; }
    if (!Array.isArray(list)) list = [];
    list.push(entry);
    // Attribut limité à 5000 caractères : on garde la fin, la plus récente.
    let json = JSON.stringify(list);
    while (json.length > 4900 && list.length > 1) { list.shift(); json = JSON.stringify(list); }
    return json;
}

/** Statistiques agrégées, SANS aucune donnée personnelle. */
export function buildStats(docs, now = Date.now()) {
    const count = (key) => docs.reduce((acc, d) => { const k = d[key] || '—'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const days = {};
    for (let i = 13; i >= 0; i -= 1) days[new Date(now - i * 86400000).toISOString().slice(0, 10)] = 0;
    for (const d of docs) { const k = String(d.createdAt || '').slice(0, 10); if (k in days) days[k] += 1; }
    const delays = docs
        .filter((d) => d.firstActionAt && d.createdAt)
        .map((d) => (Date.parse(d.firstActionAt) - Date.parse(d.createdAt)) / 60000)
        .filter((m) => Number.isFinite(m) && m >= 0)
        .sort((a, b) => a - b);
    const open = docs.filter((d) => OPEN_STATUSES.includes(d.status));
    return {
        total: docs.length,
        byStatus: count('status'),
        byChannel: count('channel'),
        byPriority: count('priority'),
        byPoster: Object.entries(count('posterCode')).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([code, n]) => ({ code, n })),
        perDay: Object.entries(days).map(([day, n]) => ({ day, n })),
        openCount: open.length,
        openUrgent: open.filter((d) => d.priority === 'urgent').length,
        waitingOver1h: open.filter((d) => d.status === 'nouvelle' && now - Date.parse(d.createdAt) > 3600000).length,
        medianFirstActionMin: delays.length ? Math.round(delays[Math.floor(delays.length / 2)]) : null,
    };
}

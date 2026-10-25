// crawler/lib/http.js — Zem
// Accès réseau poli : identifie le robot, limite le temps et la taille, espace les visites.
export const USER_AGENT = process.env.ZEM_USER_AGENT || 'ZemBot/1.0 (moteur de recherche béninois de Vanessa)';
const MAX_BYTES = 2_500_000;
const MAX_PDF_BYTES = 8_000_000;

export function makeFetcher({ delayMs = 1000, timeoutMs = 15000, fetchImpl = fetch } = {}) {
    const lastHit = new Map(); // hôte → dernier passage
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    async function request(url, asBytes) {
        const host = new URL(url).hostname;
        const wait = (lastHit.get(host) || 0) + delayMs - Date.now();
        if (wait > 0) await sleep(wait);
        lastHit.set(host, Date.now());
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const r = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5' }, signal: ctrl.signal, redirect: 'follow' });
            const contentType = r.headers.get('content-type') || '';
            if (!r.ok) return { status: r.status, text: '', contentType };
            const buf = await r.arrayBuffer();
            if (buf.byteLength > (asBytes ? MAX_PDF_BYTES : MAX_BYTES)) return { status: 413, text: '', contentType };
            if (asBytes) return { status: r.status, bytes: Buffer.from(buf), text: '', contentType, finalUrl: r.url };
            return { status: r.status, text: new TextDecoder('utf-8').decode(buf), contentType, finalUrl: r.url };
        } catch (e) {
            return { status: 0, text: '', contentType: '', error: e?.name === 'AbortError' ? 'délai dépassé' : (e?.message || 'erreur réseau') };
        } finally {
            clearTimeout(timer);
        }
    }
    const fetchText = (url) => request(url, false);
    fetchText.bytes = (url) => request(url, true); // même politesse, réponse en octets (PDF)
    return fetchText;
}

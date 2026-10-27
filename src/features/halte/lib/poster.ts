// src/features/halte/lib/poster.ts — HALTE
// QR codes et affiche imprimable. Trois QR, du plus simple au plus robuste :
//   web  : ouvre la page « Parler en sécurité » (il faut un peu de réseau) ;
//   sms  : prépare un SMS d'alerte (marche SANS internet, sur n'importe quel téléphone avec appareil photo) ;
//   appel: compose le 138 (marche sans internet).
import QRCode from 'qrcode';
import { EMERGENCY_NUMBERS, SMS_NUMBER, publicBaseUrl } from '../config';

export const cleanCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);

export const webUrl = (code: string) => `${publicBaseUrl()}/halte${code ? `?p=${encodeURIComponent(code)}` : ''}`;
export const smsUrl = (code: string) => `sms:${SMS_NUMBER}?body=${encodeURIComponent(`HALTE ${code}`.trim())}`;
export const callUrl = () => `tel:${EMERGENCY_NUMBERS[0].number}`;

export const qrSvg = (text: string) =>
    QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'Q', margin: 2, color: { dark: '#221B17', light: '#FFFFFF' } });

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Ouvre l'affiche A4 dans un nouvel onglet, prête à imprimer. */
export async function openPoster(code: string, footer: string): Promise<boolean> {
    const [web, sms, call] = await Promise.all([qrSvg(webUrl(code)), SMS_NUMBER ? qrSvg(smsUrl(code)) : Promise.resolve(''), qrSvg(callUrl())]);
    const block = (title: string, hint: string, svg: string) => `<div class="b"><div class="q">${svg}</div><h2>${esc(title)}</h2><p>${esc(hint)}</p></div>`;
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Affiche ${esc(code)}</title>
<style>
@page{size:A4;margin:12mm} *{box-sizing:border-box} body{font-family:system-ui,sans-serif;color:#221B17;margin:0;text-align:center}
h1{font-size:46px;line-height:1.1;margin:8px 0 6px} .sub{font-size:22px;margin:0 0 18px}
.row{display:flex;gap:14px;justify-content:center} .b{flex:1;border:3px solid #221B17;border-radius:18px;padding:12px}
.q svg{width:100%;height:auto} .b h2{font-size:21px;margin:8px 0 4px} .b p{font-size:15px;margin:0}
.nums{margin:18px 0 6px;font-size:26px;font-weight:800} .nums span{display:inline-block;margin:0 14px}
.foot{font-size:14px;margin-top:10px;color:#444} .code{font-size:12px;color:#777}
</style></head><body>
<h1>Tu as le droit de parler.</h1><p class="sub">Tu n’as rien fait de mal. Tu n’es pas seul(e).</p>
<div class="row">
${block('Écrire un message', 'Scanne avec l’appareil photo de ton téléphone', web)}
${sms ? block('Sans internet', 'Scanne : un SMS est prêt, appuie sur envoyer', sms) : ''}
${block(`Appeler le ${EMERGENCY_NUMBERS[0].number}`, 'Gratuit, jour et nuit', call)}
</div>
<p class="nums">${EMERGENCY_NUMBERS.map((n) => `<span>${esc(n.number)} — ${esc(n.label)}</span>`).join('')}</p>
<p class="foot">${esc(footer)}</p><p class="code">${esc(code)}</p>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return false;
    w.document.open();
    w.document.write(html);
    w.document.close();
    return true;
}

// src/utils/emailDomainValidator.ts — Vanessa
// Repris tel quel du principe Kinema+ : on vérifie qu'un domaine email a un
// enregistrement DNS MX (ou A en repli) avant de créer un compte, pour
// bloquer les fautes de frappe évidentes (ex: "gmil.co").
export type EmailDomainCheckResult =
    | { valid: true }
    | { valid: false; reason: 'malformed' | 'no_dns_record' };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function checkEmailDomain(email: string): Promise<EmailDomainCheckResult> {
    if (!EMAIL_REGEX.test(email)) {
        return { valid: false, reason: 'malformed' };
    }

    const domain = email.split('@')[1];

    try {
        // API DNS-over-HTTPS publique de Google — pas de clé requise.
        const mxRes = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
        const mxData = await mxRes.json();
        if (mxData.Answer && mxData.Answer.length > 0) {
            return { valid: true };
        }

        // Repli sur un enregistrement A si pas de MX
        const aRes = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
        const aData = await aRes.json();
        if (aData.Answer && aData.Answer.length > 0) {
            return { valid: true };
        }

        return { valid: false, reason: 'no_dns_record' };
    } catch {
        // En cas d'échec réseau de la vérification DNS elle-même, on
        // n'empêche pas l'inscription (fail-open) — mieux vaut un compte
        // potentiellement mal orthographié qu'un blocage total du service.
        return { valid: true };
    }
}

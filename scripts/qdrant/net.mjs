// scripts/qdrant/net.mjs
// fetch avec délai d'attente et nouvelles tentatives, pour les connexions instables.
export async function fetchRetry(url, options = {}, { retries = 3, timeoutMs = 20000, label = 'requête' } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
            if (res.status === 429 || res.status >= 500) throw new Error(`réponse ${res.status}`);
            return res;
        } catch (err) {
            lastError = err;
            const reason = err.cause?.code || err.cause?.errors?.[0]?.code || err.name || err.message;
            if (attempt < retries) {
                console.log(`   ⚠️ ${label} : tentative ${attempt}/${retries} échouée (${reason}), nouvel essai...`);
                await new Promise((r) => setTimeout(r, 2000 * attempt));
            }
        }
    }
    const reason = lastError?.cause?.code || lastError?.cause?.errors?.[0]?.code || lastError?.message;
    throw new Error(`${label} impossible après ${retries} tentatives (${reason}). Vérifie ta connexion internet ou ton VPN.`);
}
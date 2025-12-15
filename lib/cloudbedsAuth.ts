// ======================================================
// === TIPOS DE PROPIEDAD =================================
// ======================================================

export type PropId =
    | "lapunta"
    | "aguablanca"
    | "esmeralda"
    | "manzanillo";

// ======================================================
// === CREDENCIALES OAUTH POR PROPIEDAD =================
// ======================================================
//
// Se leen desde .env.local — deben existir:
//
//   CLOUDBEDS_CLIENT_ID_MANZANILLO
//   CLOUDBEDS_CLIENT_SECRET_MANZANILLO
//   CLOUDBEDS_REFRESH_TOKEN_MANZANILLO
//
// Igual que las otras propiedades.
//

const CREDS: Record<
    PropId,
    { clientId?: string; clientSecret?: string; refreshToken?: string }
> = {
    lapunta: {
        clientId: process.env.CLOUDBEDS_CLIENT_ID_LAPUNTA,
        clientSecret: process.env.CLOUDBEDS_CLIENT_SECRET_LAPUNTA,
        refreshToken: process.env.CLOUDBEDS_REFRESH_TOKEN_LAPUNTA,
    },
    aguablanca: {
        clientId: process.env.CLOUDBEDS_CLIENT_ID_AGUABLANCA,
        clientSecret: process.env.CLOUDBEDS_CLIENT_SECRET_AGUABLANCA,
        refreshToken: process.env.CLOUDBEDS_REFRESH_TOKEN_AGUABLANCA,
    },
    esmeralda: {
        clientId: process.env.CLOUDBEDS_CLIENT_ID_ESMERALDA,
        clientSecret: process.env.CLOUDBEDS_CLIENT_SECRET_ESMERALDA,
        refreshToken: process.env.CLOUDBEDS_REFRESH_TOKEN_ESMERALDA,
    },

    // === 🆕 MANZANILLO ===
    manzanillo: {
        clientId: process.env.CLOUDBEDS_CLIENT_ID_MANZANILLO,
        clientSecret: process.env.CLOUDBEDS_CLIENT_SECRET_MANZANILLO,
        refreshToken: process.env.CLOUDBEDS_REFRESH_TOKEN_MANZANILLO,
    },
};

// ======================================================
// === CACHE DE TOKENS (memoria RAM del servidor) =======
// ======================================================
//
// Cada propiedad mantiene su propio token OAuth renovado automáticamente.
//

const cache: Partial<Record<PropId, { token: string; expiresAt: number }>> = {};


// ======================================================
// === FUNCIÓN PRINCIPAL: obtiene token OAuth válido =====
// ======================================================

export async function getCloudbedsAccessToken(propertyId: PropId) {
    const cached = cache[propertyId];

    // Si el token aún es válido → úsalo
    if (cached && Date.now() < cached.expiresAt) {
        return cached.token;
    }

    const creds = CREDS[propertyId];
    if (!creds.clientId || !creds.clientSecret || !creds.refreshToken) {
        throw new Error(`Missing OAuth credentials for property: ${propertyId}`);
    }

    // Cloudbeds requiere este formato EXACTO
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: creds.refreshToken,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
    });

    // IMPORTANTÍSIMO: el endpoint correcto es /access_token
    const res = await fetch(
        "https://hotels.cloudbeds.com/api/v1.1/access_token",
        {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        }
    );

    const json = await res.json();

    if (!res.ok || !json.access_token) {
        console.error(`OAuth ERROR (${propertyId}):`, json); // log útil
        throw new Error(
            json.error_description ||
            json.message ||
            "Could not refresh Cloudbeds OAuth token"
        );
    }

    // Guardamos token en cache (Cloudbeds da expires_in en segundos)
    cache[propertyId] = {
        token: json.access_token,
        expiresAt: Date.now() + json.expires_in * 1000,
    };

    return json.access_token;
}

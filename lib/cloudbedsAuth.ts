type PropId = "lapunta" | "aguablanca" | "esmeralda";

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
};

// cache por propiedad
const cache: Partial<Record<PropId, { token: string; expiresAt: number }>> = {};

export async function getCloudbedsAccessToken(propertyId: PropId) {
    const cached = cache[propertyId];
    if (cached && Date.now() < cached.expiresAt) return cached.token;

    const creds = CREDS[propertyId];
    if (!creds.clientId || !creds.clientSecret || !creds.refreshToken) {
        throw new Error(`Missing OAuth credentials for ${propertyId}`);
    }

    // Cloudbeds exige x-www-form-urlencoded y dominio hotels.cloudbeds.com :contentReference[oaicite:1]{index=1}
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: creds.refreshToken,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
    });

    const res = await fetch("https://hotels.cloudbeds.com/api/v1.1/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    const json = await res.json();

    if (!res.ok || !json.access_token) {
        throw new Error(
            json.error_description || json.message || "Cannot refresh token"
        );
    }

    cache[propertyId] = {
        token: json.access_token,
        expiresAt: Date.now() + (json.expires_in * 1000), // normalmente 3600s :contentReference[oaicite:2]{index=2}
    };

    return json.access_token;
}

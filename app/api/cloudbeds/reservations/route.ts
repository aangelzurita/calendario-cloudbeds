import { NextResponse } from "next/server";
import { getCloudbedsAccessToken } from "@/lib/cloudbedsAuth";

const CLOUDBEDS_API = "https://api.cloudbeds.com/api/v1.3";

// Nombres de casas
const PROPERTY_NAMES = {
  lapunta: "Aguamiel La Punta",
  aguablanca: "Aguamiel Agua Blanca",
  esmeralda: "Aguamiel Esmeralda",
} as const;

const PROPERTY_IDS = ["lapunta", "aguablanca", "esmeralda"] as const;

// ===== Cache en memoria (simple) =====
type CacheEntry<T> = { ts: number; data: T };
const CACHE_TTL_MS = 1000 * 60 * 2; // 2 minutos

const globalCache =
  (globalThis as any).__cloudbedsCache ||
  ((globalThis as any).__cloudbedsCache = new Map<string, CacheEntry<any>>());

function getCache<T>(key: string): T | null {
  const hit = globalCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    globalCache.delete(key);
    return null;
  }
  return hit.data as T;
}

function setCache<T>(key: string, data: T) {
  globalCache.set(key, { ts: Date.now(), data });
}

// ====== GET ======
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { success: false, message: "Missing startDate or endDate" },
      { status: 400 }
    );
  }

  // ✅ (B2.1) Creamos la key del cache
  const cacheKey = `reservations:${startDate}:${endDate}`;

  // ✅ (B2.2) Revisamos si ya existe en cache
  const cached = getCache<any>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  // ✅ Si no hay cache, ahora sí pegamos a Cloudbeds
  const results = await Promise.all(
    PROPERTY_IDS.map(async (pid) => {
      try {
        const token = await getCloudbedsAccessToken(pid);

        const url = `${CLOUDBEDS_API}/getReservations?startDate=${startDate}&endDate=${endDate}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();

        return {
          id: pid,
          name: PROPERTY_NAMES[pid],
          success: json.success === true,
          reservations: json.data || [],
          error: json.success ? null : json.message || null,
        };
      } catch (error: any) {
        return {
          id: pid,
          name: PROPERTY_NAMES[pid],
          success: false,
          reservations: [],
          error: error.message || "Request failed",
        };
      }
    })
  );

  // ✅ (B2.3) Armamos el payload final
  const payload = {
    success: true,
    properties: results,
  };

  // ✅ (B2.4) Guardamos en cache antes de responder
  setCache(cacheKey, payload);

  return NextResponse.json(payload, { status: 200 });
}

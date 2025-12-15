import { NextResponse } from "next/server";
import { getCloudbedsAccessToken } from "@/lib/cloudbedsAuth";

const CLOUDBEDS_API = "https://api.cloudbeds.com/api/v1.3";

// === Nombres amigables ===
const PROPERTY_NAMES = {
  lapunta: "Aguamiel La Punta",
  aguablanca: "Aguamiel Agua Blanca",
  esmeralda: "Aguamiel Esmeralda",
  manzanillo: "Aguamiel Manzanillo",
} as const;

// === Lista de propiedades que deben consultarse ===
const PROPERTY_IDS = [
  "lapunta",
  "aguablanca",
  "esmeralda",
  "manzanillo",
] as const;

// ===== Cache simple en memoria =====
type CacheEntry<T> = { ts: number; data: T };
const CACHE_TTL_MS = 1000 * 60 * 2; // 2 min

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

// =========================================================
// ===============      GET RESERVATIONS     ===============
// =========================================================

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

  // ====== CACHE KEY ======
  const cacheKey = `reservations:${startDate}:${endDate}`;

  // ====== CHECK CACHE ======
  const cached = getCache<any>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  // ====== FETCH DE TODAS LAS PROPIEDADES ======
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

  // ====== PAYLOAD FINAL ======
  const payload = {
    success: true,
    properties: results,
  };

  // ====== GUARDAR EN CACHE ======
  setCache(cacheKey, payload);

  return NextResponse.json(payload, { status: 200 });
}

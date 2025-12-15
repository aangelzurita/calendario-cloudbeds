import { NextResponse } from "next/server";
import { getCloudbedsAccessToken } from "@/lib/cloudbedsAuth";

const CLOUDBEDS_API = "https://api.cloudbeds.com/api/v1.3";

const PROPERTY_NAMES = {
  lapunta: "Aguamiel La Punta",
  aguablanca: "Aguamiel Agua Blanca",
  esmeralda: "Aguamiel Esmeralda",
  manzanillo: "Aguamiel Manzanillo", // 👈 nuevo!
} as const;

type PropertyId = keyof typeof PROPERTY_NAMES;

// ====== helpers fecha ======
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getDateRange(start: Date, end: Date) {
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    days.push(new Date(d));
  }
  return days;
}

// ====== mapLimit (concurrencia controlada) ======
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>
) {
  const results: R[] = [];
  let i = 0;

  const workers = new Array(limit).fill(null).map(async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

// ====== cache simple en memoria ======
const CACHE = new Map<string, { expires: number; payload: any }>();
const TTL_MS = 1000 * 60 * 10; // 10 min

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const adults = searchParams.get("adults") || "2";
  const stayNights = Number(searchParams.get("nights") || "2");

  if (!startDateStr || !endDateStr) {
    return NextResponse.json(
      { success: false, message: "Missing startDate or endDate" },
      { status: 400 }
    );
  }

  // ====== cache key ======
  const cacheKey = `${startDateStr}_${endDateStr}_a${adults}_n${stayNights}`;
  const cached = CACHE.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expires > now) {
    return NextResponse.json(cached.payload, { status: 200 });
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const dayList = getDateRange(start, end);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDays = dayList.filter((d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x > today;
  });

  // 👈 AGREGAMOS MANZANILLO
  const propertyIds: PropertyId[] = ["lapunta", "aguablanca", "esmeralda", "manzanillo"];

  const results = await Promise.all(
    propertyIds.map(async (pid) => {
      try {
        const token = await getCloudbedsAccessToken(pid);

        const availabilityByDay: boolean[] = Array(dayList.length).fill(true);

        if (futureDays.length === 0) {
          return {
            id: pid,
            name: PROPERTY_NAMES[pid],
            success: true,
            availability: availabilityByDay,
            error: null,
          };
        }

        const futureResults = await mapLimit(
          futureDays,
          5,
          async (day) => {
            const sd = fmt(day);
            const ed = fmt(addDays(day, stayNights));
            const url = `${CLOUDBEDS_API}/getAvailableRoomTypes?startDate=${sd}&endDate=${ed}&adults=${adults}`;

            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();

            if (!json.success || !json.data?.[0]?.propertyRooms) {
              return { day, vendible: true };
            }

            const rooms = json.data[0].propertyRooms;
            const vendible = rooms.some(
              (r: any) =>
                r.roomsAvailable !== undefined &&
                Number(r.roomsAvailable) > 0
            );

            return { day, vendible };
          }
        );

        futureResults.forEach(({ day, vendible }) => {
          const idx = Math.floor(
            (new Date(day).getTime() - start.getTime()) /
            (1000 * 60 * 60 * 24)
          );
          if (idx >= 0 && idx < availabilityByDay.length) {
            availabilityByDay[idx] = vendible;
          }
        });

        return {
          id: pid,
          name: PROPERTY_NAMES[pid],
          success: true,
          availability: availabilityByDay,
          error: null,
        };
      } catch (e: any) {
        return {
          id: pid,
          name: PROPERTY_NAMES[pid],
          success: false,
          availability: [],
          error: e?.message || "Request failed",
        };
      }
    })
  );

  const payload = { success: true, properties: results };

  CACHE.set(cacheKey, {
    expires: now + TTL_MS,
    payload,
  });

  return NextResponse.json(payload, { status: 200 });
}

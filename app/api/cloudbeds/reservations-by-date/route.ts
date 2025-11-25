import { NextResponse } from "next/server";
import { getCloudbedsAccessToken } from "@/lib/cloudbedsAuth";

const CLOUDBEDS_API = "https://api.cloudbeds.com/api/v1.3";

const PROPERTY_NAMES = {
    lapunta: "Aguamiel La Punta",
    aguablanca: "Aguamiel Agua Blanca",
    esmeralda: "Aguamiel Esmeralda",
} as const;

const PROPERTY_IDS = ["lapunta", "aguablanca", "esmeralda"] as const;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const date = searchParams.get("date"); // YYYY-MM-DD
    const monthStart = searchParams.get("monthStart");
    const monthEnd = searchParams.get("monthEnd");

    if (!date || !monthStart || !monthEnd) {
        return NextResponse.json(
            { success: false, message: "Missing date or month range" },
            { status: 400 }
        );
    }

    const results = await Promise.all(
        PROPERTY_IDS.map(async (pid) => {
            try {
                const token = await getCloudbedsAccessToken(pid);

                // Traemos TODO el mes (para no hacer 31 requests)
                const url = `${CLOUDBEDS_API}/getReservations?startDate=${monthStart}&endDate=${monthEnd}`;

                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                    next: { revalidate: 60 }, // cache 60s
                });

                const json = await res.json();

                const allReservations = Array.isArray(json.data) ? json.data : [];

                // Filtramos solo las que cubren ese día
                const dayReservations = allReservations.filter((r: any) => {
                    if (!r.startDate || !r.endDate) return false;
                    return r.startDate <= date && date < r.endDate;
                });

                return {
                    id: pid,
                    name: PROPERTY_NAMES[pid],
                    success: true,
                    reservations: dayReservations,
                    error: null,
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

    return NextResponse.json(
        { success: true, properties: results },
        { status: 200 }
    );
}

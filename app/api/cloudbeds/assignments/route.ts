import { NextResponse } from "next/server";
import { getCloudbedsAccessToken } from "@/lib/cloudbedsAuth";

const CLOUDBEDS_API = "https://api.cloudbeds.com/api/v1.3";

const PROPERTY_NAMES: Record<string, string> = {
    lapunta: "Aguamiel La Punta",
    aguablanca: "Aguamiel Agua Blanca",
    esmeralda: "Aguamiel Esmeralda",
};

const PROPERTY_IDS = ["lapunta", "aguablanca", "esmeralda"] as const;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!date) {
        return NextResponse.json(
            { success: false, message: "Missing date param (YYYY-MM-DD)" },
            { status: 400 }
        );
    }

    const results = await Promise.all(
        PROPERTY_IDS.map(async (pid) => {
            try {
                const token = await getCloudbedsAccessToken(pid);

                // ✅ Endpoint real para asignaciones por día
                const url = `${CLOUDBEDS_API}/getReservationAssignments?date=${date}`;

                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                });

                const json = await res.json();

                return {
                    id: pid,
                    name: PROPERTY_NAMES[pid],
                    success: json.success === true,
                    assignments: json.data || [],
                    error: json.success ? null : json.message || "Cloudbeds error",
                };
            } catch (error: any) {
                return {
                    id: pid,
                    name: PROPERTY_NAMES[pid],
                    success: false,
                    assignments: [],
                    error: error.message || "Request failed",
                };
            }
        })
    );

    return NextResponse.json(
        { success: true, properties: results, date },
        { status: 200 }
    );
}

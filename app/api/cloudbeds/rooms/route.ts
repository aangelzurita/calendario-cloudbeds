import { NextResponse } from "next/server";
import { getCloudbedsAccessToken } from "@/lib/cloudbedsAuth";

const CLOUDBEDS_API = "https://api.cloudbeds.com/api/v1.3";

const PROPERTY_NAMES = {
    lapunta: "Aguamiel La Punta",
    aguablanca: "Aguamiel Agua Blanca",
    esmeralda: "Aguamiel Esmeralda",
} as const;

type PropertyId = keyof typeof PROPERTY_NAMES;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const rawMode = searchParams.get("raw") === "1";

    const propertyIds: PropertyId[] = ["lapunta", "aguablanca", "esmeralda"];

    const results = await Promise.all(
        propertyIds.map(async (pid) => {
            try {
                const token = await getCloudbedsAccessToken(pid);

                const url = `${CLOUDBEDS_API}/getRooms?includeRoomTypeDetails=true`;

                const res = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "X-Property-ID":
                            process.env[`CLOUDBEDS_PROPERTY_ID_${pid.toUpperCase()}`] || "",
                    },
                    cache: "no-store",
                });

                const json = await res.json();

                if (!res.ok || json.success !== true) {
                    return {
                        id: pid,
                        name: PROPERTY_NAMES[pid],
                        success: false,
                        rooms: [],
                        error: json.message || "Error en getRooms",
                    };
                }

                // Debug opcional
                if (rawMode) {
                    return {
                        id: pid,
                        name: PROPERTY_NAMES[pid],
                        success: true,
                        raw: json.data ?? json,
                        rooms: [],
                        error: null,
                    };
                }

                /**
                 * 🔥 ESTA es la clave:
                 * json.data = [ { propertyID, rooms:[...] } ]
                 * entonces hay que:
                 * 1) iterar data
                 * 2) sacar rooms de cada bloque
                 * 3) aplanar todo
                 */
                const blocks: any[] = Array.isArray(json.data) ? json.data : [];
                const rawRooms: any[] = blocks.flatMap((b) =>
                    Array.isArray(b.rooms) ? b.rooms : []
                );

                const rooms = rawRooms.map((r) => ({
                    roomID: r.roomID ?? null,
                    roomName: r.roomName ?? null,
                    roomTypeID: r.roomTypeID ?? null,
                    roomTypeName: r.roomTypeName ?? null,
                    roomTypeNameShort: r.roomTypeNameShort ?? null,
                    maxGuests: r.maxGuests ?? null,
                    isPrivate: r.isPrivate ?? null,
                    isVirtual: r.isVirtual ?? null,
                    roomBlocked: r.roomBlocked ?? null,
                }));

                return {
                    id: pid,
                    name: PROPERTY_NAMES[pid],
                    success: true,
                    rooms,
                    error: null,
                };
            } catch (error: any) {
                return {
                    id: pid,
                    name: PROPERTY_NAMES[pid],
                    success: false,
                    rooms: [],
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

import { NextResponse } from "next/server";
import { getCloudbedsAccessToken } from "@/lib/cloudbedsAuth";

const PROPERTY_MAP: Record<string, string> = {
    lapunta: "318973",
    aguablanca: "318972",
    esmeralda: "318979",
    manzanillo: "312398",
};

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const property = searchParams.get("property");
        const date = searchParams.get("date");

        if (!property || !date) {
            return NextResponse.json(
                { success: false, message: "Missing parameters" },
                { status: 400 }
            );
        }

        const propertyID = PROPERTY_MAP[property];
        if (!propertyID) {
            return NextResponse.json(
                { success: false, message: "Invalid property ID" },
                { status: 400 }
            );
        }

        // Esta es la función correcta en TU proyecto
        const accessToken = await getCloudbedsAccessToken(property as any);

        // (OJO) endpoint correcto
        const url = `https://hotels.cloudbeds.com/api/v1.1/getRoomTypes?propertyID=${propertyID}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const json = await res.json();

        if (!json.success) {
            return NextResponse.json(
                { success: false, message: json.message || "Cloudbeds error" },
                { status: 500 }
            );
        }

        // Convertimos a un formato simple que el frontend pueda usar
        const availability = json.data.map((rt: any) => ({
            roomTypeID: rt.roomTypeID,
            name: rt.roomTypeName,
            occupied: rt.roomsAvailable === 0,
        }));

        return NextResponse.json({ success: true, rooms: availability });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, message: e.message },
            { status: 500 }
        );
    }
}

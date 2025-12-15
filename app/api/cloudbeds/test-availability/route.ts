import { NextResponse } from "next/server";
import { getCloudbedsAccessToken } from "@/lib/cloudbedsAuth";

const CLOUDBEDS_API = "https://api.cloudbeds.com/api/v1.3";

export async function GET(req: Request) {
    const date = "2025-12-12"; // <-- cámbialo por la fecha que quieras
    const end = "2025-12-16";
    const adults = 2;

    const token = await getCloudbedsAccessToken("manzanillo"); // propiedad a probar

    const url = `${CLOUDBEDS_API}/getAvailableRoomTypes?startDate=${date}&endDate=${end}&adults=${adults}`;

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const json = await res.json();
    return NextResponse.json(json);
}

import { NextResponse } from "next/server";

const CLOUDBEDS_API = "https://api.cloudbeds.com/api/v1.3";

// Mapea aquí tus propiedades Aguamiel
const PROPERTIES = {
  lapunta: {
    name: "Aguamiel La Punta",
    token: process.env.CLOUDBEDS_TOKEN_LAPUNTA,
  },
  aguablanca: {
    name: "Aguamiel Agua Blanca",
    token: process.env.CLOUDBEDS_TOKEN_AGUABLANCA,
  },
  esmeralda: {
    name: "Aguamiel Esmeralda",
    token: process.env.CLOUDBEDS_TOKEN_ESMERALDA,
  },
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const adults = searchParams.get("adults") || "2";

  if (!startDate || !endDate) {
    return NextResponse.json(
      { success: false, message: "Missing startDate or endDate" },
      { status: 400 }
    );
  }

  // Solo propiedades que tengan token configurado
  const activeProps = Object.entries(PROPERTIES).filter(
    ([, cfg]) => !!cfg.token
  );

  if (activeProps.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "No Cloudbeds tokens configured for any property",
      },
      { status: 500 }
    );
  }

  // Llamamos Cloudbeds por cada propiedad
  const results = await Promise.all(
    activeProps.map(async ([id, cfg]) => {
      try {
        const url = `${CLOUDBEDS_API}/getAvailableRoomTypes?startDate=${startDate}&endDate=${endDate}&adults=${adults}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${cfg.token}` },
        });

        const json = await res.json();

        return {
          id,
          name: cfg.name,
          success: json.success === true,
          data: json.data || null,
          error: json.success ? null : json.message || null,
        };
      } catch (error: any) {
        return {
          id,
          name: cfg.name,
          success: false,
          data: null,
          error: error.message || "Request failed",
        };
      }
    })
  );

  return NextResponse.json(
    {
      success: true,
      properties: results,
    },
    { status: 200 }
  );
}

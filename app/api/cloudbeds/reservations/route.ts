import { NextResponse } from "next/server";

const CLOUDBEDS_API = "https://api.cloudbeds.com/api/v1.3";

// Usa los mismos tokens/propiedades que en availability
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

  if (!startDate || !endDate) {
    return NextResponse.json(
      { success: false, message: "Missing startDate or endDate" },
      { status: 400 }
    );
  }

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

  // Pedimos reservas por propiedad usando getReservations
  // Usamos checkInFrom/checkInTo como rango de estancia.
  const results = await Promise.all(
    activeProps.map(async ([id, cfg]) => {
      try {
        const url =
          `${CLOUDBEDS_API}/getReservations` +
          `?checkInFrom=${startDate}` +
          `&checkInTo=${endDate}` +
          `&includeGuestsDetails=false`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${cfg.token}`,
          },
        });

        const json = await res.json();

        return {
          id,
          name: cfg.name,
          success: json.success === true,
          reservations: json.data || [],
          error: json.success ? null : json.message || null,
        };
      } catch (error: any) {
        return {
          id,
          name: cfg.name,
          success: false,
          reservations: [],
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

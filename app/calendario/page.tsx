"use client";

import { useEffect, useState } from "react";

type RoomType = {
  roomTypeID: string;
  roomTypeName: string;
  maxGuests: string;
  roomsAvailable?: number;
};

type AvailabilityResponse = {
  success: boolean;
  data?: Array<{
    propertyID: string;
    propertyRooms: RoomType[];
  }>;
};

const START_DATE = "2025-11-10";
const END_DATE = "2025-11-15";

// util simple para generar rango de fechas
function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

export default function CalendarioPage() {
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dates = getDateRange(START_DATE, END_DATE);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const params = new URLSearchParams({
          startDate: START_DATE,
          endDate: END_DATE,
          adults: "2",
        });

        const res = await fetch(`/api/cloudbeds/availability?${params.toString()}`);
        const json: AvailabilityResponse = await res.json();

        if (!res.ok || json.success === false) {
          throw new Error((json as any).message || "Error al obtener disponibilidad");
        }

        setData(json);

        const property = json.data?.[0];
        const mapped =
          property?.propertyRooms?.map((r: any) => ({
            roomTypeID: r.roomTypeID,
            roomTypeName: r.roomTypeName,
            maxGuests: r.maxGuests,
            roomsAvailable: r.roomsAvailable,
          })) || [];

        setRooms(mapped);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, []);

  if (loading) {
    return <div className="p-6">Cargando calendario...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">
        Error al cargar disponibilidad: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <h1 className="text-2xl font-semibold mb-2">
        Calendario Aguamiel (demo conectado a Cloudbeds)
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Rango consultado: <span className="font-semibold">{START_DATE}</span> a{" "}
        <span className="font-semibold">{END_DATE}</span>
      </p>

      {rooms.length === 0 ? (
        <p>No se encontró disponibilidad para este rango.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-2xl p-4 bg-slate-900/70">
          <table className="min-w-max border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 border-b border-slate-800 text-left">
                  Propiedad
                </th>
                {dates.map((date) => (
                  <th
                    key={date}
                    className="px-3 py-2 border-b border-slate-800 text-center"
                  >
                    {date.slice(5)}{/* MM-DD */}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.roomTypeID}>
                  <td className="px-3 py-2 border-b border-slate-900 font-medium">
                    {room.roomTypeName}
                  </td>
                  {dates.map((date) => {
                    // OJO: esta demo marca todo el rango igual
                    // porque Cloudbeds aquí nos da roomsAvailable para el rango.
                    // Para modo pro, usaríamos disponibilidad diaria si el endpoint la incluye.
                    const disponible =
                      room.roomsAvailable && room.roomsAvailable > 0;

                    return (
                      <td
                        key={date}
                        className="px-3 py-2 border-b border-slate-900 text-center"
                      >
                        <div
                          className={`mx-auto h-6 w-6 rounded-full text-[10px] flex items-center justify-center ${
                            disponible
                              ? "bg-emerald-500/80 text-slate-950"
                              : "bg-red-500/70 text-white"
                          }`}
                        >
                          {disponible ? "OK" : "X"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        *Esta es una vista demo usando getAvailableRoomTypes con el token fijo.
        Luego cambiamos a OAuth completo (token + refresh) y a disponibilidad por día.
      </p>
    </div>
  );
}


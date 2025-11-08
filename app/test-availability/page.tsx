"use client";

import { useEffect, useState } from "react";

type RoomType = {
  roomTypeID: string;
  roomTypeName: string;
  maxGuests: string;
  roomRate?: number;
  roomsAvailable?: number;
};

type AvailabilityData = {
  success: boolean;
  data?: Array<{
    propertyID: string;
    propertyCurrency?: {
      currencyCode: string;
      currencySymbol: string;
      currencyPosition: "before" | "after";
    };
    propertyRooms: RoomType[];
  }>;
};

export default function TestAvailabilityPage() {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const params = new URLSearchParams({
          startDate: "2025-11-10",
          endDate: "2025-11-15",
          adults: "2",
        });

        const res = await fetch(`/api/cloudbeds/availability?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || json.success === false) {
          throw new Error(json.message || "Error al obtener disponibilidad");
        }

        // Guardamos todo por si quieres ver el JSON
        setData(json);

        // Sacamos solo lo que nos interesa para mostrar:
        const property = json.data?.[0];
        const mappedRooms =
          property?.propertyRooms?.map((r: any) => ({
            roomTypeID: r.roomTypeID,
            roomTypeName: r.roomTypeName,
            maxGuests: r.maxGuests,
            roomRate: r.roomRate,
            roomsAvailable: r.roomsAvailable,
          })) || [];

        setRooms(mappedRooms);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, []);

  if (loading) {
    return <div style={{ padding: 20 }}>Cargando disponibilidad...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        Error al cargar disponibilidad: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
        Disponibilidad desde Cloudbeds (demo)
      </h1>
      <p style={{ marginBottom: 16, color: "#6b7280" }}>
        Rango consultado: <strong>2025-11-10</strong> a <strong>2025-11-15</strong>
      </p>

      {rooms.length === 0 ? (
        <p>No se encontró disponibilidad para este rango.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "8px 4px",
                }}
              >
                Tipo de habitación
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "8px 4px",
                }}
              >
                Capacidad
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "8px 4px",
                }}
              >
                Tarifa base (aprox)
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "8px 4px",
                }}
              >
                Disponible en el rango
              </th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.roomTypeID}>
                <td
                  style={{
                    padding: "8px 4px",
                    borderBottom: "1px solid #f3f4f6",
                    fontWeight: 500,
                  }}
                >
                  {room.roomTypeName}
                </td>
                <td
                  style={{
                    padding: "8px 4px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  {room.maxGuests} huéspedes
                </td>
                <td
                  style={{
                    padding: "8px 4px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  {room.roomRate
                    ? `$${room.roomRate.toLocaleString("es-MX")}`
                    : "—"}
                </td>
                <td
                  style={{
                    padding: "8px 4px",
                    borderBottom: "1px solid #f3f4f6",
                    color:
                      room.roomsAvailable && room.roomsAvailable > 0
                        ? "#16a34a"
                        : "#dc2626",
                    fontWeight: 500,
                  }}
                >
                  {room.roomsAvailable && room.roomsAvailable > 0
                    ? "Disponible"
                    : "No disponible"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* JSON crudo abajo para debug */}
      <details>
        <summary style={{ cursor: "pointer", color: "#6b7280" }}>
          Ver respuesta completa (debug)
        </summary>
        <pre
          style={{
            marginTop: 8,
            padding: 12,
            background: "#111827",
            color: "#e5e7eb",
            borderRadius: 8,
            fontSize: 11,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

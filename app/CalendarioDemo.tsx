"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Home } from "lucide-react";

// Paleta de colores para las casas
const COLOR_POOL = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-purple-500",
];

// Lista estática de propiedades (asegura que siempre aparezcan)
const STATIC_PROPERTIES = [
  { id: "lapunta", name: "Aguamiel La Punta" },
  { id: "aguablanca", name: "Aguamiel Agua Blanca" },
  { id: "esmeralda", name: "Aguamiel Esmeralda" },
];

type AvailabilityProperty = {
  id: string;
  name: string;
  success: boolean;
  data?: any[]; // /availability
  reservations?: any[]; // /reservations
  error?: string | null;
};

type ApiResponse = {
  success: boolean;
  properties: AvailabilityProperty[];
  message?: string;
};

// ==== Utilidades de calendario ====
function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

/** Matriz 6x7 con objetos { date, inMonth } (semana inicia en lunes) */
function getMonthMatrix(year: number, month: number) {
  const first = startOfMonth(year, month);
  const wd = first.getDay(); // 0=Dom..6=Sab
  const offset = wd === 0 ? 6 : wd - 1; // Lunes = columna 0
  const matrix: { date: Date; inMonth: boolean }[][] = [];
  let dayCounter = 1 - offset;

  for (let r = 0; r < 6; r++) {
    const row: { date: Date; inMonth: boolean }[] = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(year, month, dayCounter);
      row.push({ date: d, inMonth: d.getMonth() === month });
      dayCounter++;
    }
    matrix.push(row);
  }
  return matrix;
}

export default function CalendarioDemo() {
  const hoy = new Date();

  // En vez de manejar año/mes separados (que te estaba dando el salto raro),
  // usamos UNA sola fecha anclada al día 1 del mes actual.
  const [currentDate, setCurrentDate] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  );

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [mode, setMode] = useState<"availability" | "history">("availability");
  const [seleccion, setSeleccion] = useState<string>("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Casas visibles en UI
  const [casas, setCasas] = useState<
    { id: string; nombre: string; color: string }[]
  >([{ id: "ALL", nombre: "Todas las casas", color: "bg-emerald-500" }]);

  // Ocupación: propertyId -> [bool por día]
  const [ocupacion, setOcupacion] = useState<Record<string, boolean[]>>({});

  const NDAYS = daysInMonth(currentYear, currentMonth);
  const days = useMemo(
    () => Array.from({ length: NDAYS }, (_, i) => i + 1),
    [NDAYS]
  );
  const monthMatrix = useMemo(
    () => getMonthMatrix(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

  // Navegación estable: sumamos / restamos 1 mes a currentDate
  const prevMonth = () => {
    setCurrentDate((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return new Date(y, m - 1, 1);
    });
  };

  const nextMonth = () => {
    setCurrentDate((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return new Date(y, m + 1, 1);
    });
  };

  // ==== Carga de datos (availability / history) ====
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const first = new Date(currentYear, currentMonth, 1);
        const last = new Date(currentYear, currentMonth, NDAYS);

        const fmt = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(d.getDate()).padStart(2, "0")}`;

        const startDate = fmt(first);
        const endDate = fmt(last);

        // ================== MODO HISTÓRICO ==================
        if (mode === "history") {
          const res = await fetch(
            `/api/cloudbeds/reservations?startDate=${startDate}&endDate=${endDate}`
          );
          const json: ApiResponse = await res.json();

          if (!res.ok || !json.success) {
            throw new Error(
              json.message || "Error al obtener reservas de Cloudbeds"
            );
          }

          const props = json.properties.filter((p) => p.success);

          if (!props.length) {
            // Si no llegan reservas, mostramos casas estáticas pero sin ocupación
            const nuevasCasas = [
              { id: "ALL", nombre: "Todas las casas", color: "bg-emerald-500" },
              ...STATIC_PROPERTIES.map((p, i) => ({
                id: p.id,
                nombre: p.name,
                color: COLOR_POOL[i % COLOR_POOL.length],
              })),
            ];
            setCasas(nuevasCasas);
            const vacio: Record<string, boolean[]> = {};
            STATIC_PROPERTIES.forEach((p) => {
              vacio[p.id] = Array.from({ length: NDAYS }, () => false);
            });
            setOcupacion(vacio);
            if (seleccion !== "ALL") setSeleccion("ALL");
            return;
          }

          const nuevasCasas: { id: string; nombre: string; color: string }[] = [
            { id: "ALL", nombre: "Todas las casas", color: "bg-emerald-500" },
          ];
          const nuevaOcupacion: Record<string, boolean[]> = {};

          props.forEach((p, index) => {
            const color = COLOR_POOL[index % COLOR_POOL.length];
            nuevasCasas.push({ id: p.id, nombre: p.name, color });

            const arr = Array.from({ length: NDAYS }, () => false);

            (p.reservations || []).forEach((r: any) => {
              const startRaw =
                r.startDate ||
                r.checkIn ||
                r.checkInDate ||
                r.dateFrom ||
                r.checkin_date;
              const endRaw =
                r.endDate ||
                r.checkOut ||
                r.checkOutDate ||
                r.dateTo ||
                r.checkout_date;

              if (!startRaw || !endRaw) return;

              const s = new Date(startRaw);
              const e = new Date(endRaw);

              for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
                if (
                  d.getFullYear() === currentYear &&
                  d.getMonth() === currentMonth
                ) {
                  const idx = d.getDate() - 1;
                  if (idx >= 0 && idx < NDAYS) arr[idx] = true;
                }
              }
            });

            nuevaOcupacion[p.id] = arr;
          });

          setCasas(nuevasCasas);
          setOcupacion(nuevaOcupacion);

          if (
            seleccion !== "ALL" &&
            !nuevasCasas.find((c) => c.id === seleccion)
          ) {
            setSeleccion("ALL");
          }

          return;
        }

        // ================== MODO DISPONIBILIDAD ==================
        const res = await fetch(
          `/api/cloudbeds/availability?startDate=${startDate}&endDate=${endDate}&adults=2`
        );
        const json: ApiResponse = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(
            json.message || "Error al obtener disponibilidad de Cloudbeds"
          );
        }

        let props = json.properties.filter((p) => p.success);

        // ⚠️ Caso noviembre / fechas mixtas o respuesta vacía:
        // si Cloudbeds no devuelve nada, usamos las propiedades estáticas
        if (!props.length) {
          const nuevasCasas = [
            { id: "ALL", nombre: "Todas las casas", color: "bg-emerald-500" },
            ...STATIC_PROPERTIES.map((p, i) => ({
              id: p.id,
              nombre: p.name,
              color: COLOR_POOL[i % COLOR_POOL.length],
            })),
          ];
          setCasas(nuevasCasas);

          const vacio: Record<string, boolean[]> = {};
          STATIC_PROPERTIES.forEach((p) => {
            vacio[p.id] = Array.from({ length: NDAYS }, () => false);
          });
          setOcupacion(vacio);

          if (seleccion !== "ALL") setSeleccion("ALL");
          return;
        }

        const nuevasCasas: { id: string; nombre: string; color: string }[] = [
          { id: "ALL", nombre: "Todas las casas", color: "bg-emerald-500" },
        ];
        const nuevaOcupacion: Record<string, boolean[]> = {};

        props.forEach((p, index) => {
          const color = COLOR_POOL[index % COLOR_POOL.length];
          nuevasCasas.push({ id: p.id, nombre: p.name, color });

          const arr = Array.from({ length: NDAYS }, () => false);

          const rooms =
            p.data?.[0]?.propertyRooms && Array.isArray(p.data[0].propertyRooms)
              ? p.data[0].propertyRooms
              : [];

          // Versión simplificada:
          // Si hay al menos una habitación SIN disponibilidad -> marcamos mes ocupado (a pulso).
          const algunSinDisponibilidad = rooms.some(
            (r: any) =>
              r.roomsAvailable !== undefined &&
              Number(r.roomsAvailable) <= 0
          );

          arr.fill(algunSinDisponibilidad);
          nuevaOcupacion[p.id] = arr;
        });

        setCasas(nuevasCasas);
        setOcupacion(nuevaOcupacion);

        if (
          seleccion !== "ALL" &&
          !nuevasCasas.find((c) => c.id === seleccion)
        ) {
          setSeleccion("ALL");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, currentYear, currentMonth, NDAYS, seleccion]);

  // ==== Helpers ====
  const casaOrder = useMemo(
    () => casas.filter((c) => c.id !== "ALL"),
    [casas]
  );

  const isBooked = (id: string, date: Date) => {
    if (id === "ALL") return false;
    if (date.getMonth() !== currentMonth) return false;
    const day = date.getDate();
    return ocupacion[id]?.[day - 1] ?? false;
  };

  const bookedMapForDate = (date: Date) => {
    const map: Record<string, boolean> = {};
    casaOrder.forEach((c) => {
      const arr = ocupacion[c.id] || [];
      const day = date.getDate();
      map[c.id] =
        date.getMonth() === currentMonth && arr[day - 1] ? true : false;
    });
    return map;
  };

  const inMonthDates = useMemo(
    () => monthMatrix.flat().filter((c) => c.inMonth).map((c) => c.date),
    [monthMatrix]
  );
  const totalDiasMes = inMonthDates.length;

  const kpis = useMemo(() => {
    const counts: Record<string, number> = {};
    casaOrder.forEach((c) => (counts[c.id] = 0));
    inMonthDates.forEach((d) => {
      casaOrder.forEach((c) => {
        if (isBooked(c.id, d)) counts[c.id]++;
      });
    });
    return counts;
  }, [inMonthDates, casaOrder, ocupacion]);

  const totalOcupados = Object.values(kpis).reduce((a, b) => a + b, 0);
  const totalSlots = totalDiasMes * (casaOrder.length || 1);
  const ocupacionGlobal =
    totalSlots > 0 ? Math.round((totalOcupados / totalSlots) * 100) : 0;

  const rows =
    seleccion === "ALL"
      ? casaOrder
      : casaOrder.filter((c) => c.id === seleccion);

  // ==== Render estados especiales ====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <CalendarDays className="animate-pulse text-emerald-500 w-5 h-5 mr-2" />
        Cargando datos desde Cloudbeds...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="font-semibold mb-1">
            Error al cargar el calendario
          </div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  // ==== Render principal ====
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 space-y-6">
      {/* Header */}
      <header className="w-full max-w-6xl flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CalendarDays className="text-emerald-600 w-7 h-7" />
            <h1 className="text-2xl font-semibold text-gray-800">
              Calendario de Ocupación Aguamiel
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-emerald-500 text-emerald-600 text-sm"
            >
              {monthNames[currentMonth]} {currentYear}
            </Button>
            <button
              onClick={() => setMode("availability")}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                mode === "availability"
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              Disponibilidad
            </button>
            <button
              onClick={() => setMode("history")}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                mode === "history"
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* Selector de casas */}
        <div className="flex flex-wrap items-center gap-2">
          {casas.map((c) => (
            <button
              key={c.id}
              onClick={() => setSeleccion(c.id)}
              className={`text-sm px-3 py-1.5 rounded-full border transition ${
                seleccion === c.id
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {c.id === "ALL" ? "Todas" : c.nombre}
            </button>
          ))}
        </div>
      </header>

      {/* Vista mensual */}
      <div className="w-full max-w-6xl rounded-xl border border-gray-200 bg-white p-4">
        {/* Header mes */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold text-gray-800">
            {monthNames[currentMonth]} {currentYear}
            <span className="ml-2 text-xs text-gray-500">
              {seleccion === "ALL"
                ? "· Todas las casas"
                : `· ${
                    casas.find((c) => c.id === seleccion)?.nombre || ""
                  }`}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
            >
              ← Mes anterior
            </button>
            <button
              onClick={nextMonth}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
            >
              Mes siguiente →
            </button>
          </div>
        </div>

        {/* Días semana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((wd) => (
            <div
              key={wd}
              className="text-xs text-center text-gray-500 font-medium py-1"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-rows-6 gap-1">
          {monthMatrix.map((week, rIdx) => (
            <div key={rIdx} className="grid grid-cols-7 gap-1">
              {week.map((cell, cIdx) => {
                const inMonth = cell.inMonth;
                const date = cell.date;
                const bookedSel =
                  seleccion !== "ALL" && isBooked(seleccion, date);

                return (
                  <div
                    key={cIdx}
                    className={[
                      "h-20 rounded-md border p-1 relative text-xs",
                      inMonth
                        ? "border-gray-200 bg-white"
                        : "border-gray-100 bg-gray-50",
                      bookedSel
                        ? "ring-2 ring-emerald-500 ring-offset-2"
                        : "",
                    ].join(" ")}
                  >
                    {/* Número de día */}
                    <div
                      className={`absolute top-1 left-1 text-[10px] ${
                        inMonth ? "text-gray-500" : "text-gray-300"
                      }`}
                    >
                      {date.getDate()}
                    </div>

                    {/* Barras */}
                    {inMonth && (
                      <>
                        {seleccion === "ALL" ? (
                          <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
                            {(() => {
                              const map = bookedMapForDate(date);
                              return casaOrder.map((c) => (
                                <div
                                  key={c.id}
                                  className={`h-1.5 rounded ${
                                    map[c.id]
                                      ? c.color
                                      : "bg-gray-100"
                                  }`}
                                />
                              ));
                            })()}
                          </div>
                        ) : (
                          <div className="absolute bottom-1 left-1 right-1">
                            <div
                              className={`h-2 rounded ${
                                bookedSel
                                  ? (
                                      casaOrder.find(
                                        (c) => c.id === seleccion
                                      )?.color || "bg-emerald-500"
                                    )
                                  : "bg-gray-100"
                              }`}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div className="col-span-1 rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Ocupación global</div>
          <div className="text-2xl font-semibold text-gray-800">
            {ocupacionGlobal}%
          </div>
          <div className="text-[11px] text-gray-400">
            {totalOcupados}/{totalSlots} noches
          </div>
        </div>
        {casaOrder.map((c) => {
          const occ =
            totalDiasMes > 0
              ? Math.round(((kpis[c.id] || 0) / totalDiasMes) * 100)
              : 0;
          return (
            <div
              key={c.id}
              className="rounded-xl border border-gray-200 bg-white p-3"
            >
              <div className="text-xs text-gray-500">{c.nombre}</div>
              <div className="text-xl font-semibold text-gray-800">
                {occ}%
              </div>
              <div className="text-[11px] text-gray-400">
                {kpis[c.id] || 0}/{totalDiasMes} noches
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista lineal */}
      <Card className="w-full max-w-6xl border border-gray-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-[160px_1fr] items-end">
            <div className="text-xs font-medium text-gray-500">
              Propiedad
            </div>
            <div
              className="grid gap-0.5"
              style={{
                gridTemplateColumns: `repeat(${NDAYS}, minmax(0, 1fr))`,
              }}
            >
              {days.map((d) => (
                <div
                  key={d}
                  className="text-[10px] text-center text-gray-400"
                >
                  {d}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[160px_1fr] items-center gap-2"
              >
                <div className="flex items-center gap-2">
                  <Home
                    className={`w-5 h-5 ${r.color} text-white rounded-full p-1`}
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    {r.nombre}
                  </span>
                </div>
                <div
                  className="grid gap-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${NDAYS}, minmax(0, 1fr))`,
                  }}
                >
                  {days.map((d) => {
                    const occ = ocupacion[r.id]?.[d - 1];
                    return (
                      <div
                        key={d}
                        className={`h-6 rounded-sm ${
                          occ ? r.color : "bg-gray-100"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-gray-100" />{" "}
              Libre
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />{" "}
              Ocupado
            </span>
            <span className="ml-auto text-[11px] text-gray-400">
              Usa los filtros para ver una sola casa o todas.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

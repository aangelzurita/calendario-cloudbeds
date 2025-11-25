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
  data?: any[]; // ya no se usa, pero lo dejamos por compatibilidad
  reservations?: any[];
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

// ==== Helpers nuevos ====

// 1) Mezcla propiedades del API con las estáticas (siempre visibles)
function mergeWithStatic(propsApi: AvailabilityProperty[]) {
  const mapApi = new Map(propsApi.map((p) => [p.id, p]));

  const merged: AvailabilityProperty[] = STATIC_PROPERTIES.map((sp) => {
    const apiP = mapApi.get(sp.id);
    return apiP
      ? { ...apiP, name: sp.name }
      : { id: sp.id, name: sp.name, success: true, reservations: [] };
  });

  propsApi.forEach((p) => {
    if (!STATIC_PROPERTIES.find((s) => s.id === p.id)) merged.push(p);
  });

  return merged;
}

// 2) Color estable por id (no depende del orden del API)
function colorForId(id: string) {
  const idx = STATIC_PROPERTIES.findIndex((p) => p.id === id);
  if (idx >= 0) return COLOR_POOL[idx % COLOR_POOL.length];

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 997;
  }
  return COLOR_POOL[hash % COLOR_POOL.length];
}

// Formato YYYY-MM-DD
function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
// ✅ LOGOUT SIMPLE (borra cookie server-side)
async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login";
}

export default function CalendarioDemo() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Fecha anclada al día 1 del mes actual
  const [currentDate, setCurrentDate] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  );

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [seleccion, setSeleccion] = useState<string>("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Casas visibles en UI
  const [casas, setCasas] = useState<
    { id: string; nombre: string; color: string }[]
  >([{ id: "ALL", nombre: "Todas las casas", color: "bg-emerald-500" }]);

  // Ocupación: propertyId -> [bool por día]
  const [ocupacion, setOcupacion] = useState<Record<string, boolean[]>>({});

  // ===== Modal detalle =====
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [detalleDia, setDetalleDia] = useState<any[] | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

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
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

  // Navegación estable
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

  // ==== Carga de datos SOLO RESERVAS ====
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const first = new Date(currentYear, currentMonth, 1);
        const last = new Date(currentYear, currentMonth, NDAYS);

        const startDate = fmt(first);
        const endDate = fmt(last);

        const res = await fetch(
          `/api/cloudbeds/reservations?startDate=${startDate}&endDate=${endDate}`
        );
        const json: ApiResponse = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Error al obtener reservas de Cloudbeds");
        }

        const props = mergeWithStatic(json.properties.filter((p) => p.success));

        const nuevasCasas: { id: string; nombre: string; color: string }[] = [
          { id: "ALL", nombre: "Todas las casas", color: "bg-emerald-500" },
        ];
        const nuevaOcupacion: Record<string, boolean[]> = {};

        props.forEach((p) => {
          const color = colorForId(p.id);
          nuevasCasas.push({ id: p.id, nombre: p.name, color });

          const arr = Array.from({ length: NDAYS }, () => false);

          // Convertir fecha sin error de zona horaria
          const toLocalDate = (raw: string) => {
            const [y, m, d] = raw.split("-").map(Number);
            return new Date(y, m - 1, d); // <-- fecha local sin desfase UTC
          };

          (p.reservations || []).forEach((r: any) => {
            const s = toLocalDate(r.startDate);
            const e = toLocalDate(r.endDate);

            // recorremos: start incluido, end EXCLUIDO
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
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentYear, currentMonth, NDAYS]); // sin seleccion para no recargar al filtrar

  // ==== Helpers UI / KPIs ====
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

  const isPastDate = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x < hoy;
  };

  // ===== Click día → modal con reservas =====
  const onDayClick = async (date: Date) => {
    if (date.getMonth() !== currentMonth) return;

    setSelectedDay(date);
    setDetalleLoading(true);
    setDetalleDia(null);

    const monthStart = fmt(new Date(currentYear, currentMonth, 1));
    const monthEnd = fmt(new Date(currentYear, currentMonth, NDAYS));
    const dayStr = fmt(date);

    const res = await fetch(
      `/api/cloudbeds/reservations-by-date?date=${dayStr}&monthStart=${monthStart}&monthEnd=${monthEnd}`
    );
    const json = await res.json();

    setDetalleDia(json.properties || []);
    setDetalleLoading(false);
  };

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
            <Button variant="outline" className="border-emerald-500 text-emerald-600 text-sm">
              {monthNames[currentMonth]} {currentYear}
            </Button>

            <button
              onClick={logout}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
            >
              Cerrar sesión
            </button>
          </div>

        </div>

        {/* Selector de casas */}
        <div className="flex flex-wrap items-center gap-2">
          {casas.map((c) => (
            <button
              key={c.id}
              onClick={() => setSeleccion(c.id)}
              className={`text-sm px-3 py-1.5 rounded-full border transition ${seleccion === c.id
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
                : `· ${casas.find((c) => c.id === seleccion)?.nombre || ""}`}
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

                const past = isPastDate(date);

                return (
                  <div
                    key={cIdx}
                    onClick={() => onDayClick(date)}
                    className={[
                      "h-20 rounded-md border p-1 relative text-xs cursor-pointer",
                      inMonth
                        ? "border-gray-200 bg-white"
                        : "border-gray-100 bg-gray-50 cursor-default",
                      bookedSel
                        ? "ring-2 ring-emerald-500 ring-offset-2"
                        : "",
                    ].join(" ")}
                  >
                    {/* Número de día */}
                    <div
                      className={`absolute top-1 left-1 text-[10px] ${inMonth ? "text-gray-500" : "text-gray-300"
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
                                  className={`h-1.5 rounded ${map[c.id] ? c.color : "bg-gray-100"
                                    } ${map[c.id] && past ? "opacity-40" : ""}`}
                                />
                              ));
                            })()}
                          </div>
                        ) : (
                          <div className="absolute bottom-1 left-1 right-1">
                            <div
                              className={`h-2 rounded ${bookedSel
                                ? casaOrder.find((c) => c.id === seleccion)
                                  ?.color || "bg-emerald-500"
                                : "bg-gray-100"
                                } ${bookedSel && past ? "opacity-40" : ""}`}
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
              <div className="text-xl font-semibold text-gray-800">{occ}%</div>
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
            <div className="text-xs font-medium text-gray-500">Propiedad</div>
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
                    const cellDate = new Date(currentYear, currentMonth, d);
                    const past = isPastDate(cellDate);

                    return (
                      <div
                        key={d}
                        className={`h-6 rounded-sm ${occ ? r.color : "bg-gray-100"
                          } ${occ && past ? "opacity-40" : ""}`}
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

      {/* ===== Modal detalle día ===== */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-white rounded-xl p-4 border">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-gray-800">
                Habitaciones ocupadas · {fmt(selectedDay)}
              </div>
              <button
                onClick={() => {
                  setSelectedDay(null);
                  setDetalleDia(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            {detalleLoading && (
              <div className="text-sm text-gray-500">Cargando...</div>
            )}

            {!detalleLoading &&
              detalleDia &&
              detalleDia.map((p) => (
                <div key={p.id} className="mb-3">
                  <div className="font-medium text-gray-700">{p.name}</div>

                  {p.reservations.length === 0 ? (
                    <div className="text-sm text-gray-400">
                      Sin reservas.
                    </div>
                  ) : (
                    <ul className="text-sm mt-1 space-y-1">
                      {p.reservations.map((r: any) => (
                        <li
                          key={r.reservationID}
                          className="border rounded-md p-2"
                        >
                          <div>Reserva: {r.reservationID}</div>
                          <div>Huésped: {r.guestName}</div>
                          <div className="text-[11px] text-gray-500">
                            {r.startDate} → {r.endDate}
                          </div>
                          <div className="text-[11px] text-amber-600">
                            (Puede no tener cuarto asignado aún)
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

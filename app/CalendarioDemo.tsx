/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
'use client';
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Home } from "lucide-react";

// Configuración de propiedades (branding neutro + color por casa)
const casas = [
  { id: "ALL", nombre: "Todas las casas", color: "bg-emerald-500" },
  { id: "centro", nombre: "Casa Centro", color: "bg-green-500" },
  { id: "playa", nombre: "Casa Playa", color: "bg-blue-500" },
  { id: "montana", nombre: "Casa Montaña", color: "bg-amber-500" },
  { id: "jardin", nombre: "Casa Jardín", color: "bg-pink-500" },
];

// Genera ocupación de ejemplo determinística por propiedad (solo demo)
// Nota: usamos 31 por defecto para no depender de NDAYS.
function generarOcupacion(seed: number, days = 31) {
  const arr: boolean[] = Array.from({ length: days }, () => false);
  let x = seed * 9973; // semilla simple
  for (let d = 0; d < days; d++) {
    x = (x * 1664525 + 1013904223) % 4294967296;
    const r = x / 4294967296;
    if (!arr[d] && r > 0.75) {
      const dur = 2 + Math.floor((r * 10) % 5); // 2..6
      for (let k = 0; k < dur && d + k < days; k++) arr[d + k] = true;
    }
  }
  return arr;
}

// ---- Utils calendario mensual (semana inicia Lunes) ----
function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
/** Regresa una matriz 6x7 con objetos { date: Date, inMonth: boolean } */
function getMonthMatrix(year: number, month: number) {
  const first = startOfMonth(year, month);
  // getDay(): 0=Dom,1=Lun,... → queremos 0=Lunes
  const wd = first.getDay(); // 0..6
  const offset = wd === 0 ? 6 : wd - 1; // cuántos días “vacíos” antes del 1
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
  const [mes] = useState("Octubre 2025");

  // --- Estado de mes/año actual para la vista mensual ---
  const hoy = new Date();
  const [currentYear, setCurrentYear] = useState(hoy.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(hoy.getMonth()); // 0=enero..11=diciembre

  // --- Días del mes actual (para vista lineal y mensual) ---
  const NDAYS = daysInMonth(currentYear, currentMonth); // usa util
  const days = Array.from({ length: NDAYS }, (_, i) => i + 1);

  // Matriz 6x7 con días del mes (y celdas fuera de mes)
  const monthMatrix = useMemo(() => {
    return getMonthMatrix(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Etiquetas útiles
  const monthNames = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio",
    "Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];
  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

  // --- Navegación de mes ---
  const prevMonth = () => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };
  const nextMonth = () => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const [seleccion, setSeleccion] = useState<string>("ALL");

  // Ocupación demo por propiedad (en real, vendrá de la API). Usamos arrays de 31.
  const ocupacion = useMemo(
    () => ({
      centro: generarOcupacion(1, 31),
      playa: generarOcupacion(2, 31),
      montana: generarOcupacion(3, 31),
      jardin: generarOcupacion(4, 31),
    }),
    []
  );

  // --- Helper: ¿está ocupado ese día? (demo usa día del mes como índice) ---
  function isBooked(propId: string, date: Date) {
    if (propId === "ALL") return false; // en mensual "ALL" se maneja distinto
    if (date.getMonth() !== currentMonth) return false; // no pintar fuera de mes
    const day = date.getDate(); // 1..31
    if (day < 1 || day > NDAYS) return false;
    return (ocupacion as any)[propId]?.[day - 1] ?? false;
  }

  // Orden fijo para pintar todas las casas en vista mensual
  const casaOrder = [
    { id: "centro",  nombre: "Casa Centro",   color: "bg-green-500" },
    { id: "playa",   nombre: "Casa Playa",    color: "bg-blue-500" },
    { id: "montana", nombre: "Casa Montaña",  color: "bg-amber-500" },
    { id: "jardin",  nombre: "Casa Jardín",   color: "bg-pink-500" },
  ];

  // Mapa de ocupación por casa para una fecha (demo: día del mes como índice)
  function bookedMapForDate(date: Date) {
    const map: Record<string, boolean> = {};
    if (date.getMonth() !== currentMonth) {
      casaOrder.forEach(c => (map[c.id] = false));
      return map;
    }
    const day = date.getDate(); // 1..31
    casaOrder.forEach(c => {
      const arr = (ocupacion as any)[c.id] as boolean[] | undefined;
      map[c.id] = day >= 1 && day <= NDAYS ? (arr?.[day - 1] ?? false) : false;
    });
    return map;
  }

  // --- KPIs por mes seleccionado ---
  const inMonthDates = useMemo(() => {
    return monthMatrix.flat().filter(c => c.inMonth).map(c => c.date);
  }, [monthMatrix]);

  const totalDiasMes = inMonthDates.length;

  // cuenta ocupación por casa usando la lógica del mes seleccionado
  const kpis = useMemo(() => {
    const counts: Record<string, number> = { centro: 0, playa: 0, montana: 0, jardin: 0 };
    inMonthDates.forEach((d) => {
      if (isBooked("centro", d)) counts.centro++;
      if (isBooked("playa", d)) counts.playa++;
      if (isBooked("montana", d)) counts.montana++;
      if (isBooked("jardin", d)) counts.jardin++;
    });
    return counts;
  }, [inMonthDates, currentMonth, currentYear]);

  const totalOcupados = kpis.centro + kpis.playa + kpis.montana + kpis.jardin;
  const totalSlots = totalDiasMes * 4; // 4 casas
  const ocupacionGlobal = totalSlots > 0 ? Math.round((totalOcupados / totalSlots) * 100) : 0;

  // Filas de la vista lineal (todas o solo la seleccionada)
  const rows = useMemo(() => {
    const base = [
      { id: "centro", nombre: "Casa Centro", color: "bg-green-500" },
      { id: "playa", nombre: "Casa Playa", color: "bg-blue-500" },
      { id: "montana", nombre: "Casa Montaña", color: "bg-amber-500" },
      { id: "jardin", nombre: "Casa Jardín", color: "bg-pink-500" },
    ];
    return seleccion === "ALL" ? base : base.filter((b) => b.id === seleccion);
  }, [seleccion]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 space-y-6">
      {/* Encabezado */}
      <header className="w-full max-w-6xl flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CalendarDays className="text-emerald-600 w-7 h-7" />
            <h1 className="text-2xl font-semibold text-gray-800">
              Calendario de Ocupación
            </h1>
          </div>
          <Button variant="outline" className="border-emerald-500 text-emerald-600">
            {mes}
          </Button>
        </div>

        {/* Selector: Todas / una sola casa */}
        <div className="flex flex-wrap items-center gap-2">
          {casas.map((c) => (
            <button
              key={c.id}
              onClick={() => setSeleccion(c.id)}
              className={`text-sm px-3 py-1.5 rounded-full border transition ${
                seleccion === c.id
                  ? `border-emerald-500 text-emerald-700 bg-emerald-50`
                  : `border-gray-200 text-gray-600 hover:border-gray-300`
              }`}
            >
              {c.id === "ALL" ? "Todas" : c.nombre}
            </button>
          ))}
        </div>
      </header>

      {/* ===== Vista mensual real ===== */}
      <div className="w-full max-w-6xl rounded-xl border border-gray-200 bg-white p-4 mt-2">
        {/* Encabezado mensual: mes/año + navegación */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold text-gray-800">
            {monthNames[currentMonth]} {currentYear}
            <span className="ml-2 text-xs text-gray-500">
              {seleccion === "ALL"
                ? " · Todas las casas"
                : ` · ${casas.find(c => c.id === seleccion)?.nombre}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Leyenda compacta por colores */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {(seleccion === "ALL" ? casaOrder : casaOrder.filter(c => c.id === seleccion)).map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 text-xs">
              <span className={`inline-block w-3 h-3 rounded-sm ${c.color}`} />
              <span className="text-gray-600">{c.nombre}</span>
            </div>
          ))}
          {seleccion === "ALL" && (
            <span className="ml-auto text-[11px] text-gray-400">
              Vista mensual · 4 barras por día (una por casa)
            </span>
          )}
        </div>

        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((wd) => (
            <div
              key={wd}
              className="text-xs font-medium text-gray-500 text-center py-1"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Matriz 6x7 de días */}
        <div className="grid grid-rows-6 gap-1">
          {monthMatrix.map((week, rIdx) => (
            <div key={rIdx} className="grid grid-cols-7 gap-1">
              {week.map((cell, cIdx) => {
                const inMonth = cell.inMonth;
                const booked = seleccion !== "ALL" && isBooked(seleccion, cell.date);

                return (
                  <div
                    key={cIdx}
                    className={[
                      "h-20 rounded-md border text-xs p-1 relative",
                      inMonth ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50",
                      booked ? "ring-2 ring-emerald-500 ring-offset-2" : "",
                    ].join(" ")}
                    title={
                      inMonth
                        ? `${cell.date.toLocaleDateString("es-MX")} · ${booked ? "Ocupado" : "Libre"}`
                        : ""
                    }
                  >
                    {/* Día del mes */}
                    <div className={`absolute top-1 left-1 text-[10px] ${inMonth ? "text-gray-500" : "text-gray-300"}`}>
                      {cell.date.getDate()}
                    </div>

                    {/* Estado dentro de cada día */}
                    {inMonth && (
                      <>
                        {seleccion === "ALL" ? (
                          // Modo: Todas las casas → 4 mini-barras, una por casa
                          <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
                            {(() => {
                              const map = bookedMapForDate(cell.date);
                              return casaOrder.map((c) => (
                                <div
                                  key={c.id}
                                  className={`h-1.5 rounded ${map[c.id] ? c.color : "bg-gray-100"}`}
                                  title={`${c.nombre} · ${map[c.id] ? "Ocupado" : "Libre"}`}
                                />
                              ));
                            })()}
                          </div>
                        ) : (
                          // Modo: una casa seleccionada → una sola barra
                          <div className="absolute bottom-1 left-1 right-1">
                            <div
                              className={`h-2 rounded ${
                                isBooked(seleccion, cell.date)
                                  ? (rows[0]?.color ?? "bg-emerald-500")
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

      {/* KPIs de ocupación */}
      <div className="w-full max-w-6xl grid grid-cols-5 gap-3">
        <div className="col-span-5 sm:col-span-1 rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Ocupación global</div>
          <div className="text-2xl font-semibold text-gray-800">{ocupacionGlobal}%</div>
          <div className="text-[11px] text-gray-400">{totalOcupados}/{totalSlots} noches</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Casa Centro</div>
          <div className="text-xl font-semibold text-gray-800">{Math.round((kpis.centro/totalDiasMes)*100)}%</div>
          <div className="text-[11px] text-gray-400">{kpis.centro}/{totalDiasMes} noches</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Casa Playa</div>
          <div className="text-xl font-semibold text-gray-800">{Math.round((kpis.playa/totalDiasMes)*100)}%</div>
          <div className="text-[11px] text-gray-400">{kpis.playa}/{totalDiasMes} noches</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Casa Montaña</div>
          <div className="text-xl font-semibold text-gray-800">{Math.round((kpis.montana/totalDiasMes)*100)}%</div>
          <div className="text-[11px] text-gray-400">{kpis.montana}/{totalDiasMes} noches</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Casa Jardín</div>
          <div className="text-xl font-semibold text-gray-800">{Math.round((kpis.jardin/totalDiasMes)*100)}%</div>
          <div className="text-[11px] text-gray-400">{kpis.jardin}/{totalDiasMes} noches</div>
        </div>
      </div>

      {/* Vista lineal (sincronizada al mes) */}
      <Card className="w-full max-w-6xl shadow-sm border border-gray-200">
        <CardContent className="p-4">
          {/* Cabecera de días */}
          <div className="grid grid-cols-[160px_1fr] items-end">
            <div className="text-xs font-medium text-gray-500">Propiedad</div>
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(${NDAYS}, minmax(0,1fr))` }}
            >
              {days.map((d) => (
                <div
                  key={d}
                  className="text-[10px] text-gray-400 text-center select-none"
                >
                  {d}
                </div>
              ))}
            </div>
          </div>

          {/* Filas: todas o solo la seleccionada */}
          <div className="mt-2 space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[160px_1fr] items-center gap-2"
              >
                {/* Etiqueta de propiedad */}
                <div className="flex items-center gap-2">
                  <Home
                    className={`w-5 h-5 ${row.color} text-white rounded-full p-1`}
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    {row.nombre}
                  </span>
                </div>

                {/* Banda de NDAYS días */}
                <div
                  className="grid gap-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${NDAYS}, minmax(0,1fr))`,
                  }}
                >
                  {Array.from({ length: NDAYS }, (_, i) => i).map((i) => {
                    const ocupado = (ocupacion as any)[row.id]?.[i] ?? false;
                    return (
                      <div
                        key={i}
                        title={`${row.nombre} — Día ${i + 1}: ${ocupado ? "Ocupado" : "Libre"}`}
                        className={`h-6 rounded-sm ${ocupado ? row.color : "bg-gray-100"}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Leyenda */}
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
              Vista unificada · Usa los chips para mostrar solo una casa
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

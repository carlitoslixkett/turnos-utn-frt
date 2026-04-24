"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Database } from "@/types";

type TurnsByNote = Database["public"]["Views"]["v_turns_by_note"]["Row"];
type Absenteeism = Database["public"]["Views"]["v_absenteeism_rate"]["Row"];
type Occupancy = Database["public"]["Views"]["v_interval_occupancy"]["Row"];
type Heatmap = Database["public"]["Views"]["v_demand_heatmap"]["Row"];

interface MetricasClientProps {
  turnsByNote: TurnsByNote[];
  absenteeism: Absenteeism[];
  occupancy: Occupancy[];
  heatmap: Heatmap[];
}

const COLORS = ["#E94A1F", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white px-5 py-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
    </div>
  );
}

export function MetricasClient({
  turnsByNote,
  absenteeism,
  occupancy,
  heatmap,
}: MetricasClientProps) {
  const totalTurns = turnsByNote.reduce((acc, r) => acc + (r.total ?? 0), 0);
  const pendingCount = turnsByNote
    .filter((r) => r.status === "pending")
    .reduce((acc, r) => acc + (r.total ?? 0), 0);
  const attendedCount = turnsByNote
    .filter((r) => r.status === "attended")
    .reduce((acc, r) => acc + (r.total ?? 0), 0);

  const avgAbsenteeism =
    absenteeism.length > 0
      ? (
          absenteeism.reduce((acc, r) => acc + (r.absenteeism_pct ?? 0), 0) / absenteeism.length
        ).toFixed(1)
      : "0";

  // Aggregate turns by note name for bar chart
  const byNoteAgg = Object.values(
    turnsByNote.reduce(
      (acc, r) => {
        const name = r.note_name ?? "Desconocido";
        if (!acc[name]) acc[name] = { name, total: 0 };
        acc[name].total += r.total ?? 0;
        return acc;
      },
      {} as Record<string, { name: string; total: number }>
    )
  );

  // Pie chart data for status distribution
  const statusAgg = Object.values(
    turnsByNote.reduce(
      (acc, r) => {
        const s = r.status ?? "unknown";
        if (!acc[s]) acc[s] = { name: s, value: 0 };
        acc[s].value += r.total ?? 0;
        return acc;
      },
      {} as Record<string, { name: string; value: number }>
    )
  );

  const STATUS_NAMES: Record<string, string> = {
    pending: "Pendiente",
    attended: "Atendido",
    lost: "Ausente",
    cancelled: "Cancelado",
  };

  // Heatmap: aggregate by day_of_week
  const heatByDay = DAYS.map((day, idx) => ({
    day,
    total: heatmap
      .filter((h) => h.day_of_week === idx)
      .reduce((a, h) => a + (h.turn_count ?? 0), 0),
  }));

  const noData = totalTurns === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Métricas</h1>
        <p className="text-muted-foreground text-sm">Panel de estadísticas del sistema de turnos</p>
      </div>

      {noData ? (
        <div className="text-muted-foreground rounded-xl border bg-white py-16 text-center text-sm">
          No hay datos suficientes para mostrar métricas. Los gráficos aparecerán cuando haya turnos
          registrados.
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total de turnos" value={totalTurns} />
            <StatCard title="Pendientes" value={pendingCount} />
            <StatCard title="Atendidos" value={attendedCount} />
            <StatCard title="% Ausentismo promedio" value={`${avgAbsenteeism}%`} />
          </div>

          {/* Turns by note */}
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 text-base font-semibold">Turnos por trámite</h2>
            {byNoteAgg.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byNoteAgg}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#E94A1F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Status distribution */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-base font-semibold">Distribución por estado</h2>
              {statusAgg.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusAgg}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${STATUS_NAMES[name ?? ""] ?? name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {statusAgg.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [val, STATUS_NAMES[name as string] ?? name]}
                    />
                    <Legend formatter={(name) => STATUS_NAMES[name] ?? name} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Demand by day of week */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-base font-semibold">Demanda por día de la semana</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={heatByDay}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interval occupancy */}
          {occupancy.length > 0 && (
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-base font-semibold">Ocupación por intervalo</h2>
              <div className="space-y-3">
                {occupancy.map((o) => (
                  <div key={o.interval_id} className="flex items-center gap-3">
                    <p className="w-48 truncate text-sm font-medium">{o.interval_name}</p>
                    <div className="h-3 flex-1 rounded-full bg-gray-100">
                      <div
                        className="h-3 rounded-full bg-[#E94A1F] transition-all"
                        style={{ width: `${Math.min(o.occupancy_pct ?? 0, 100)}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground w-12 text-right text-sm">
                      {(o.occupancy_pct ?? 0).toFixed(0)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Absenteeism by note */}
          {absenteeism.length > 0 && (
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-base font-semibold">Ausentismo por trámite</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={absenteeism}>
                  <XAxis dataKey="note_name" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Ausentismo"]} />
                  <Bar dataKey="absenteeism_pct" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { AttendTurnsClient } from "./attend-turns-client";

export const metadata = { title: "Atender Turnos — Turnos UTN FRT" };

const TZ = "America/Argentina/Buenos_Aires";

function todayInOfficeTz(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function dayBoundsIso(yyyymmdd: string): { startIso: string; endIso: string } {
  // Anchor to ART start/end of the calendar day
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const offsetParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(noon);
  const get = (t: string) => offsetParts.find((p) => p.type === t)?.value ?? "0";
  const offsetMin = Math.round(
    (Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")),
      Number(get("minute"))
    ) -
      noon.getTime()) /
      60000
  );
  const startMs = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMin * 60000;
  const endMs = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - offsetMin * 60000;
  return { startIso: new Date(startMs).toISOString(), endIso: new Date(endMs).toISOString() };
}

export default async function AttendPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const today = todayInOfficeTz();
  const selectedDay = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  const { startIso, endIso } = dayBoundsIso(selectedDay);

  const supabase = await createClient();
  const { data: turns } = await supabase
    .from("turns")
    .select("*, note:notes(id, name), profile:profiles(id, full_name, dni, legajo)")
    .gte("date", startIso)
    .lte("date", endIso)
    .order("date", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Atender Turnos</h1>
        <p className="text-muted-foreground mt-1 text-sm">Mostrando turnos del día seleccionado</p>
      </div>
      <AttendTurnsClient initialTurns={turns ?? []} selectedDay={selectedDay} today={today} />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { AttendTurnsClient } from "./attend-turns-client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const metadata = { title: "Atender Turnos — Turnos UTN FRT" };

export default async function AttendPage() {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const { data: turns } = await supabase
    .from("turns")
    .select("*, note:notes(id, name), profile:profiles(id, full_name, dni, legajo)")
    .eq("status", "pending")
    .gte("date", today.toISOString())
    .lte("date", todayEnd.toISOString())
    .order("date", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Atender Turnos</h1>
        <p className="text-muted-foreground mt-1">
          {format(today, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>
      <AttendTurnsClient initialTurns={turns ?? []} />
    </div>
  );
}

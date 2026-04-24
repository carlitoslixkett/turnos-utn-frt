import { createClient } from "@/lib/supabase/server";
import { SacarTurnoClient } from "./sacar-turno-client";

export default async function SacarTurnoPage() {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const [{ data: notes }, { data: intervals }] = await Promise.all([
    supabase.from("notes").select("id, name, description").eq("is_active", true).order("name"),
    supabase
      .from("intervals")
      .select("id, name, date_start, date_end, turn_duration_minutes, interval_notes(note_id)")
      .eq("is_active", true)
      .gte("date_end", now),
  ]);

  return <SacarTurnoClient notes={notes ?? []} intervals={intervals ?? []} />;
}

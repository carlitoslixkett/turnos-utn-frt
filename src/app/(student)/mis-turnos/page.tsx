import { createClient } from "@/lib/supabase/server";
import { MisTurnosClient } from "./mis-turnos-client";

export default async function MisTurnosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: turns } = await supabase
    .from("turns")
    .select("*, notes(id, name)")
    .eq("student_id", user!.id)
    .order("preferred_date", { ascending: false });

  return <MisTurnosClient initialTurns={turns ?? []} />;
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MisTurnosClient } from "./mis-turnos-client";

export const metadata = { title: "Mis Turnos — Turnos UTN FRT" };

export default async function MisTurnosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: turns, error } = await supabase
    .from("turns")
    .select("id, status, date, attended_at, cancel_reason, created_at, notes(id, name)")
    .eq("student_id", user.id)
    .order("date", { ascending: false });

  if (error) {
    console.error("[mis-turnos] query error", error);
  }

  return <MisTurnosClient initialTurns={turns ?? []} />;
}

import { createAdminClient } from "@/lib/supabase/server";
import { parseWindows } from "@/lib/utils/interval-slots";
import { HorariosClient } from "./horarios-client";

export const metadata = { title: "Horarios de Atención — Turnos UTN FRT" };

export default async function HorariosAtencionPage() {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("office_settings")
    .select("attention_windows")
    .eq("id", 1)
    .maybeSingle();
  const initialWindows = parseWindows(data?.attention_windows);
  return <HorariosClient initialWindows={initialWindows} />;
}

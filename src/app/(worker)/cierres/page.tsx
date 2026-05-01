import { createAdminClient } from "@/lib/supabase/server";
import { OFFICE_TZ } from "@/lib/utils/interval-slots";
import { CierresClient, type ClosureRow } from "./cierres-client";

export const metadata = { title: "Cierres / Paros — Turnos UTN FRT" };

export default async function CierresPage() {
  const admin = await createAdminClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: OFFICE_TZ });

  const { data: upcoming } = await admin
    .from("office_closures")
    .select("*")
    .gte("date_end", today)
    .order("date_start", { ascending: true });

  const { data: past } = await admin
    .from("office_closures")
    .select("*")
    .lt("date_end", today)
    .order("date_start", { ascending: false })
    .limit(20);

  return (
    <CierresClient
      initialUpcoming={(upcoming ?? []) as ClosureRow[]}
      initialPast={(past ?? []) as ClosureRow[]}
      todayIso={today}
    />
  );
}

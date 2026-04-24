import { createClient } from "@/lib/supabase/server";
import { MetricasClient } from "./metricas-client";

export default async function MetricasPage() {
  const supabase = await createClient();

  const [{ data: turnsByNote }, { data: absenteeism }, { data: occupancy }, { data: heatmap }] =
    await Promise.all([
      supabase.from("v_turns_by_note").select("*"),
      supabase.from("v_absenteeism_rate").select("*"),
      supabase.from("v_interval_occupancy").select("*"),
      supabase.from("v_demand_heatmap").select("*"),
    ]);

  return (
    <MetricasClient
      turnsByNote={turnsByNote ?? []}
      absenteeism={absenteeism ?? []}
      occupancy={occupancy ?? []}
      heatmap={heatmap ?? []}
    />
  );
}

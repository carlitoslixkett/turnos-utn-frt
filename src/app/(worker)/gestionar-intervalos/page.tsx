import { createAdminClient, createClient } from "@/lib/supabase/server";
import { parseWindows } from "@/lib/utils/interval-slots";
import { IntervalsClient } from "./intervals-client";

export default async function GestionarIntervalosPage() {
  const supabase = await createClient();
  const admin = await createAdminClient();

  const [{ data: intervals }, { data: notes }, { data: settings }] = await Promise.all([
    supabase
      .from("intervals")
      .select("*, interval_notes(note_id, notes(id, name))")
      .order("date_start", { ascending: false }),
    supabase.from("notes").select("id, name").eq("is_active", true).order("name"),
    admin.from("office_settings").select("attention_windows").eq("id", 1).maybeSingle(),
  ]);

  const hasGlobalWindows = parseWindows(settings?.attention_windows).length > 0;

  return (
    <IntervalsClient
      initialIntervals={intervals ?? []}
      notes={notes ?? []}
      hasGlobalWindows={hasGlobalWindows}
    />
  );
}

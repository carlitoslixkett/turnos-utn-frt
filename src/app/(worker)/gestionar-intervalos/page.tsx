import { createClient } from "@/lib/supabase/server";
import { parseWindows } from "@/lib/utils/interval-slots";
import { IntervalsClient } from "./intervals-client";

export default async function GestionarIntervalosPage() {
  const supabase = await createClient();

  const [{ data: intervals }, { data: notes }] = await Promise.all([
    supabase
      .from("intervals")
      .select("*, interval_notes(note_id, notes(id, name))")
      .order("date_start", { ascending: false }),
    supabase.from("notes").select("id, name").eq("is_active", true).order("name"),
  ]);

  const normalized = (intervals ?? []).map((i) => ({
    ...i,
    attention_windows: parseWindows(i.attention_windows),
  }));

  return <IntervalsClient initialIntervals={normalized} notes={notes ?? []} />;
}

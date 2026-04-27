import { createAdminClient, createClient } from "@/lib/supabase/server";
import { countSlots } from "@/lib/utils/interval-slots";
import { getOfficeSettings } from "@/lib/utils/office-settings";
import { IntervalsClient } from "./intervals-client";

export default async function GestionarIntervalosPage() {
  const supabase = await createClient();
  const admin = await createAdminClient();

  const [{ data: intervals }, { data: notes }, settings] = await Promise.all([
    supabase
      .from("intervals")
      .select("*, interval_notes(note_id, notes(id, name))")
      .order("date_start", { ascending: false }),
    supabase.from("notes").select("id, name").eq("is_active", true).order("name"),
    getOfficeSettings(),
  ]);

  const hasGlobalWindows = settings.attention_windows.length > 0;

  // Recompute turn_quantity on the fly from current global settings so the
  // listing never shows stale numbers from old per-interval duration.
  const refreshed = (intervals ?? []).map((i) => ({
    ...i,
    turn_duration_minutes: settings.turn_duration_minutes,
    turn_quantity: hasGlobalWindows
      ? countSlots(
          new Date(i.date_start as string),
          new Date(i.date_end as string),
          settings.turn_duration_minutes,
          settings.attention_windows
        )
      : 0,
  }));

  // Persist the corrections in the background so the next read is already correct
  if (refreshed.length > 0) {
    void Promise.all(
      refreshed.map((i) =>
        admin
          .from("intervals")
          .update({
            turn_duration_minutes: i.turn_duration_minutes,
            turn_quantity: i.turn_quantity,
          })
          .eq("id", i.id)
      )
    );
  }

  return (
    <IntervalsClient
      initialIntervals={refreshed}
      notes={notes ?? []}
      hasGlobalWindows={hasGlobalWindows}
    />
  );
}

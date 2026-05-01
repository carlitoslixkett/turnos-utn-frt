import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { generateSlots } from "@/lib/utils/interval-slots";
import { getOfficeSettings } from "@/lib/utils/office-settings";
import { fetchClosuresInRange } from "@/lib/utils/closures";

// GET /api/turns/slots?note_id=...&date=YYYY-MM-DD
// Returns globally available slots for a given trámite on a given calendar day.
// Slots are global (one office = one slot at a time), but only times during which
// at least one active interval covers this trámite are returned.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const note_id = searchParams.get("note_id");
  const date = searchParams.get("date");
  if (!note_id || !date) {
    return NextResponse.json({ error: "Faltan parámetros (note_id, date)" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59.999`);
  const now = new Date();

  const admin = await createAdminClient();
  const { data: intervals, error: intervalsError } = await admin
    .from("intervals")
    .select("id, name, date_start, date_end, interval_notes!inner(note_id)")
    .eq("is_active", true)
    .eq("interval_notes.note_id", note_id)
    .lte("date_start", dayEnd.toISOString())
    .gte("date_end", dayStart.toISOString());
  if (intervalsError) {
    return NextResponse.json({ error: intervalsError.message }, { status: 500 });
  }
  // Office closures (paros, feriados, eventos) for this day
  const closures = await fetchClosuresInRange(date, date);
  const fullDayClosure = closures.find((c) => c.all_day) ?? null;
  const closureInfo = fullDayClosure
    ? { all_day: true as const, reason: fullDayClosure.reason }
    : closures.length > 0
      ? {
          all_day: false as const,
          reason: closures[0].reason,
          start_time: closures[0].start_time?.slice(0, 5) ?? null,
          end_time: closures[0].end_time?.slice(0, 5) ?? null,
        }
      : null;

  if (!intervals || intervals.length === 0) {
    return NextResponse.json({ data: [], closure: closureInfo });
  }

  const settings = await getOfficeSettings();
  if (settings.attention_windows.length === 0)
    return NextResponse.json({ data: [], closure: closureInfo });

  // Globally taken active turns on this calendar day (any interval, any note)
  const { data: takenTurns } = await admin
    .from("turns")
    .select("date")
    .gte("date", dayStart.toISOString())
    .lte("date", dayEnd.toISOString())
    .in("status", ["pending", "attended"]);

  const taken = new Set((takenTurns ?? []).map((t) => new Date(t.date).toISOString()));

  // For each interval covering this note + day, compute its slots and pick the
  // first interval that covers each slot (slots are global, not per interval).
  const slotMap = new Map<string, { interval_id: string; interval_name: string; date: string }>();
  for (const interval of intervals) {
    const lo = new Date(
      Math.max(dayStart.getTime(), new Date(interval.date_start as string).getTime())
    );
    const hi = new Date(
      Math.min(dayEnd.getTime(), new Date(interval.date_end as string).getTime())
    );
    const generated = generateSlots(
      lo,
      hi,
      settings.turn_duration_minutes,
      settings.attention_windows,
      closures
    );
    for (const slot of generated) {
      if (slot < now) continue;
      const iso = slot.toISOString();
      if (taken.has(iso)) continue;
      if (slotMap.has(iso)) continue;
      slotMap.set(iso, {
        interval_id: interval.id as string,
        interval_name: interval.name as string,
        date: iso,
      });
    }
  }

  const result = Array.from(slotMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({ data: result, closure: closureInfo });
}

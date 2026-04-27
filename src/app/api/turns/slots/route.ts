import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { generateSlots, parseWindows } from "@/lib/utils/interval-slots";

// GET /api/turns/slots?note_id=...&date=YYYY-MM-DD
// Returns available slots for a given trámite on a given calendar day,
// across every active interval that supports that note.
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
    .select("*, interval_notes!inner(note_id)")
    .eq("is_active", true)
    .eq("interval_notes.note_id", note_id)
    .lte("date_start", dayEnd.toISOString())
    .gte("date_end", dayStart.toISOString());
  if (intervalsError) {
    return NextResponse.json({ error: intervalsError.message }, { status: 500 });
  }
  if (!intervals || intervals.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const intervalIds = intervals.map((i) => i.id as string);

  const { data: takenTurns } = await admin
    .from("turns")
    .select("interval_id, date")
    .in("interval_id", intervalIds)
    .gte("date", dayStart.toISOString())
    .lte("date", dayEnd.toISOString())
    .in("status", ["pending", "attended"]);

  const taken = new Set(
    (takenTurns ?? []).map((t) => `${t.interval_id}|${new Date(t.date).toISOString()}`)
  );

  const slots: { interval_id: string; interval_name: string; date: string }[] = [];
  for (const interval of intervals) {
    const duration = interval.turn_duration_minutes as number;
    const windows = parseWindows(interval.attention_windows);
    const dayWindowStart = new Date(
      Math.max(dayStart.getTime(), new Date(interval.date_start as string).getTime())
    );
    const dayWindowEnd = new Date(
      Math.min(dayEnd.getTime(), new Date(interval.date_end as string).getTime())
    );
    const generated = generateSlots(dayWindowStart, dayWindowEnd, duration, windows);
    for (const slot of generated) {
      if (slot < now) continue;
      const key = `${interval.id}|${slot.toISOString()}`;
      if (taken.has(key)) continue;
      slots.push({
        interval_id: interval.id as string,
        interval_name: interval.name as string,
        date: slot.toISOString(),
      });
    }
  }

  // Deduplicate by exact ISO date (if multiple intervals overlap, keep first)
  const seen = new Set<string>();
  const deduped = slots.filter((s) => {
    if (seen.has(s.date)) return false;
    seen.add(s.date);
    return true;
  });
  deduped.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ data: deduped });
}

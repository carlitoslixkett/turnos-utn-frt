import { createAdminClient } from "@/lib/supabase/server";
import { OFFICE_TZ, zonedDateTime } from "@/lib/utils/interval-slots";

export interface OfficeClosure {
  id: string;
  date_start: string; // YYYY-MM-DD
  date_end: string; // YYYY-MM-DD
  all_day: boolean;
  start_time: string | null; // HH:MM:SS or HH:MM
  end_time: string | null;
  reason: string;
  created_at: string;
}

// Fetch all closures whose range overlaps a given window (inclusive).
// `from` and `to` are YYYY-MM-DD calendar dates in office TZ.
export async function fetchClosuresInRange(from: string, to: string): Promise<OfficeClosure[]> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("office_closures")
    .select("id, date_start, date_end, all_day, start_time, end_time, reason, created_at")
    .lte("date_start", to)
    .gte("date_end", from)
    .order("date_start", { ascending: true });
  return (data ?? []) as OfficeClosure[];
}

// Returns true if `slot` (a Date instant) falls inside an active closure.
// Uses office_tz for date/time comparison so nothing drifts by UTC offset.
export function slotIsClosed(slot: Date, closures: OfficeClosure[]): boolean {
  if (!closures.length) return false;
  // Get the slot's calendar date and HH:MM in office TZ
  const ymd = slot.toLocaleDateString("en-CA", { timeZone: OFFICE_TZ });
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: OFFICE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(slot);

  for (const c of closures) {
    if (ymd < c.date_start || ymd > c.date_end) continue;
    if (c.all_day) return true;
    if (!c.start_time || !c.end_time) continue;
    const start = c.start_time.slice(0, 5);
    const end = c.end_time.slice(0, 5);
    if (hm >= start && hm < end) return true;
  }
  return false;
}

// Returns true if `yyyymmdd` is fully closed (all_day = true).
// Useful for the student calendar to grey out whole days.
export function dayIsFullyClosed(yyyymmdd: string, closures: OfficeClosure[]): boolean {
  return closures.some((c) => c.all_day && yyyymmdd >= c.date_start && yyyymmdd <= c.date_end);
}

// Returns the first closure that affects this day (all_day or partial).
export function closureAffectingDay(
  yyyymmdd: string,
  closures: OfficeClosure[]
): OfficeClosure | null {
  return closures.find((c) => yyyymmdd >= c.date_start && yyyymmdd <= c.date_end) ?? null;
}

// Convenience for the slot pipeline: build the slot timestamp + check.
export function slotAtIsClosed(yyyymmdd: string, hhmm: string, closures: OfficeClosure[]): boolean {
  return slotIsClosed(zonedDateTime(yyyymmdd, hhmm), closures);
}

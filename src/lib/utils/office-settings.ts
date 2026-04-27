import { createAdminClient } from "@/lib/supabase/server";
import { parseWindows, type AttentionWindow } from "@/lib/utils/interval-slots";

export async function getGlobalAttentionWindows(): Promise<AttentionWindow[]> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("office_settings")
    .select("attention_windows")
    .eq("id", 1)
    .maybeSingle();
  return parseWindows(data?.attention_windows);
}

// Convert "YYYY-MM-DD" to start-of-day in office TZ as ISO UTC string for DB storage
export function dateOnlyToOfficeStart(yyyymmdd: string): string {
  const offsetMin = officeOffsetMinutes(yyyymmdd);
  const ts =
    Date.UTC(
      Number(yyyymmdd.slice(0, 4)),
      Number(yyyymmdd.slice(5, 7)) - 1,
      Number(yyyymmdd.slice(8, 10)),
      0,
      0,
      0
    ) -
    offsetMin * 60000;
  return new Date(ts).toISOString();
}

export function dateOnlyToOfficeEnd(yyyymmdd: string): string {
  const offsetMin = officeOffsetMinutes(yyyymmdd);
  const ts =
    Date.UTC(
      Number(yyyymmdd.slice(0, 4)),
      Number(yyyymmdd.slice(5, 7)) - 1,
      Number(yyyymmdd.slice(8, 10)),
      23,
      59,
      59,
      999
    ) -
    offsetMin * 60000;
  return new Date(ts).toISOString();
}

function officeOffsetMinutes(yyyymmdd: string): number {
  const noonUtc = new Date(`${yyyymmdd}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(noonUtc);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const local = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")),
    Number(get("minute"))
  );
  return Math.round((local - noonUtc.getTime()) / 60000);
}

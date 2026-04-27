export interface AttentionWindow {
  weekday: number;
  start_time: string;
  end_time: string;
}

const HHMM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

// Office timezone — slots are generated in this zone, regardless of server clock
export const OFFICE_TZ = "America/Argentina/Buenos_Aires";

export function isValidWindow(w: unknown): w is AttentionWindow {
  if (!w || typeof w !== "object") return false;
  const win = w as Record<string, unknown>;
  if (typeof win.weekday !== "number" || win.weekday < 1 || win.weekday > 7) return false;
  if (typeof win.start_time !== "string" || !HHMM_RE.test(win.start_time)) return false;
  if (typeof win.end_time !== "string" || !HHMM_RE.test(win.end_time)) return false;
  return win.start_time < win.end_time;
}

export function parseWindows(raw: unknown): AttentionWindow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidWindow);
}

// YYYY-MM-DD in office timezone for a given instant
function toZonedDateString(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: OFFICE_TZ });
}

// ISO weekday (1=Mon..7=Sun) for a calendar date in office timezone
const WEEKDAY_MAP: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};
function zonedWeekday(yyyymmdd: string): number {
  // noon avoids DST edge cases
  const ref = new Date(`${yyyymmdd}T12:00:00Z`);
  const name = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: OFFICE_TZ,
  }).format(ref);
  return WEEKDAY_MAP[name] ?? 1;
}

// Find the timezone offset (in minutes) for a given calendar date in office_tz.
// Positive = ahead of UTC, negative = behind.
function zonedOffsetMinutes(yyyymmdd: string): number {
  // Use a representative instant and compare what office_tz reports vs UTC.
  const noonUtc = new Date(`${yyyymmdd}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: OFFICE_TZ,
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

// Build a Date object for a given calendar date + HH:MM as office-tz local time
export function zonedDateTime(yyyymmdd: string, hhmm: string): Date {
  const offsetMin = zonedOffsetMinutes(yyyymmdd);
  const [h, m] = hhmm.split(":").map(Number);
  const ts =
    Date.UTC(
      Number(yyyymmdd.slice(0, 4)),
      Number(yyyymmdd.slice(5, 7)) - 1,
      Number(yyyymmdd.slice(8, 10)),
      h,
      m
    ) -
    offsetMin * 60000;
  return new Date(ts);
}

function* dateRangeInZone(start: Date, end: Date): Generator<string> {
  let cur = toZonedDateString(start);
  const last = toZonedDateString(end);
  let safety = 0;
  while (cur <= last && safety < 5000) {
    yield cur;
    // Advance by 1 calendar day in office_tz
    const noon = new Date(`${cur}T12:00:00Z`);
    noon.setUTCDate(noon.getUTCDate() + 1);
    cur = toZonedDateString(noon);
    safety++;
  }
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function generateSlots(
  dateStart: Date,
  dateEnd: Date,
  durationMinutes: number,
  windows: AttentionWindow[]
): Date[] {
  if (windows.length === 0 || durationMinutes <= 0) return [];

  const slots: Date[] = [];
  for (const day of dateRangeInZone(dateStart, dateEnd)) {
    const wd = zonedWeekday(day);
    for (const w of windows) {
      if (w.weekday !== wd) continue;
      const startMin = timeToMinutes(w.start_time);
      const endMin = timeToMinutes(w.end_time);
      for (let m = startMin; m + durationMinutes <= endMin; m += durationMinutes) {
        const h = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        const slot = zonedDateTime(day, `${h}:${mm}`);
        if (slot >= dateStart && slot <= dateEnd) slots.push(slot);
      }
    }
  }
  return slots;
}

export function countSlots(
  dateStart: Date,
  dateEnd: Date,
  durationMinutes: number,
  windows: AttentionWindow[]
): number {
  return generateSlots(dateStart, dateEnd, durationMinutes, windows).length;
}

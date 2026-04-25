import { addDays, addMinutes, startOfDay } from "date-fns";

export interface AttentionWindow {
  weekday: number;
  start_time: string;
  end_time: string;
}

const HHMM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

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

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isoWeekday(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

export function generateSlots(
  dateStart: Date,
  dateEnd: Date,
  durationMinutes: number,
  windows: AttentionWindow[]
): Date[] {
  if (windows.length === 0 || durationMinutes <= 0) return [];

  const slots: Date[] = [];
  const lastDay = startOfDay(dateEnd);
  let day = startOfDay(dateStart);

  while (day <= lastDay) {
    const wd = isoWeekday(day);
    for (const w of windows) {
      if (w.weekday !== wd) continue;
      const startMin = timeToMinutes(w.start_time);
      const endMin = timeToMinutes(w.end_time);
      const dayWithStart = addMinutes(day, startMin);
      for (let m = startMin; m + durationMinutes <= endMin; m += durationMinutes) {
        const slot = addMinutes(dayWithStart, m - startMin);
        if (slot >= dateStart && slot <= dateEnd) slots.push(slot);
      }
    }
    day = addDays(day, 1);
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

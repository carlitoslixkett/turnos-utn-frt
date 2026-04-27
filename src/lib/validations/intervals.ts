import { z } from "zod";

const HHMM = z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, "Hora inválida (HH:MM)");

export const attentionWindowSchema = z
  .object({
    weekday: z.number().int().min(1, "Día inválido").max(7, "Día inválido"),
    start_time: HHMM,
    end_time: HHMM,
  })
  .refine((w) => w.start_time < w.end_time, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["end_time"],
  });

// Accepts either ISO datetime or a plain YYYY-MM-DD date
const dateOrDatetime = z
  .string()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isNaN(Date.parse(v)), "Fecha no válida");

export const createIntervalSchema = z
  .object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100),
    description: z.string().max(500).optional(),
    date_start: dateOrDatetime,
    date_end: dateOrDatetime,
    turn_duration_minutes: z.number().int().min(5).max(120).default(15),
    note_ids: z.array(z.string().uuid()).min(1, "Seleccioná al menos un tipo de trámite"),
  })
  .refine((data) => new Date(data.date_end) >= new Date(data.date_start), {
    message: "La fecha de fin debe ser igual o posterior a la de inicio",
    path: ["date_end"],
  });

export const updateIntervalSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  date_start: dateOrDatetime.optional(),
  date_end: dateOrDatetime.optional(),
  turn_duration_minutes: z.number().int().min(5).max(120).optional(),
  note_ids: z.array(z.string().uuid()).optional(),
  is_active: z.boolean().optional(),
  explain_desactivate: z.string().max(500).optional(),
});

export type AttentionWindowInput = z.infer<typeof attentionWindowSchema>;
export type CreateIntervalInput = z.infer<typeof createIntervalSchema>;
export type UpdateIntervalInput = z.infer<typeof updateIntervalSchema>;

export const officeSettingsSchema = z.object({
  attention_windows: z.array(attentionWindowSchema),
});

export type OfficeSettingsInput = z.infer<typeof officeSettingsSchema>;

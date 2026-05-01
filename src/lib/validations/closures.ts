import { z } from "zod";

const ymd = /^\d{4}-\d{2}-\d{2}$/;
const hhmm = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export const createClosureSchema = z
  .object({
    date_start: z.string().regex(ymd, "Fecha inválida (YYYY-MM-DD)"),
    date_end: z.string().regex(ymd, "Fecha inválida (YYYY-MM-DD)"),
    all_day: z.boolean().default(true),
    start_time: z.string().regex(hhmm, "Hora inválida (HH:MM)").optional().nullable(),
    end_time: z.string().regex(hhmm, "Hora inválida (HH:MM)").optional().nullable(),
    reason: z
      .string()
      .min(3, "El motivo debe tener al menos 3 caracteres")
      .max(200, "El motivo no puede exceder los 200 caracteres"),
    confirm: z.boolean().optional(), // confirms cancellation of affected turns
  })
  .refine((d) => d.date_end >= d.date_start, {
    message: "La fecha de fin debe ser igual o posterior a la de inicio",
    path: ["date_end"],
  })
  .refine(
    (d) =>
      d.all_day ||
      (typeof d.start_time === "string" &&
        typeof d.end_time === "string" &&
        d.start_time < d.end_time),
    {
      message: "Para un cierre parcial, indicá hora de inicio y fin (start < end)",
      path: ["end_time"],
    }
  );

export type CreateClosureInput = z.infer<typeof createClosureSchema>;

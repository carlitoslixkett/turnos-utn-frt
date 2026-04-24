import { z } from "zod";

export const createIntervalSchema = z
  .object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100),
    description: z.string().max(500).optional(),
    date_start: z.string().datetime("Fecha de inicio no válida"),
    date_end: z.string().datetime("Fecha de fin no válida"),
    turn_duration_minutes: z.number().int().min(5).max(120).default(15),
    note_ids: z.array(z.string().uuid()).min(1, "Seleccioná al menos un tipo de trámite"),
  })
  .refine((data) => new Date(data.date_end) > new Date(data.date_start), {
    message: "La fecha de fin debe ser posterior a la de inicio",
    path: ["date_end"],
  });

export const updateIntervalSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  date_start: z.string().datetime().optional(),
  date_end: z.string().datetime().optional(),
  turn_duration_minutes: z.number().int().min(5).max(120).optional(),
  note_ids: z.array(z.string().uuid()).optional(),
  is_active: z.boolean().optional(),
  explain_desactivate: z.string().max(500).optional(),
});

export type CreateIntervalInput = z.infer<typeof createIntervalSchema>;
export type UpdateIntervalInput = z.infer<typeof updateIntervalSchema>;

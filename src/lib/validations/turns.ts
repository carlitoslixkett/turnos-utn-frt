import { z } from "zod";

export const createTurnSchema = z
  .object({
    note_id: z.string().uuid("Seleccioná un tipo de trámite"),
    preferred_date: z.string().datetime("Fecha no válida").optional(),
    selected_date: z.string().datetime("Horario no válido").optional(),
    selected_interval_id: z.string().uuid().optional(),
    context_data: z.record(z.string(), z.string()).optional(),
  })
  .refine((d) => d.preferred_date || d.selected_date, {
    message: "Debe indicar una fecha preferida o un horario seleccionado",
    path: ["selected_date"],
  });

export const cancelTurnSchema = z.object({
  turn_id: z.string().uuid(),
  security_code: z
    .string()
    .min(6, "El código de seguridad debe tener 6 caracteres")
    .max(6, "El código de seguridad debe tener 6 caracteres"),
});

export const workerCancelTurnSchema = z.object({
  reason: z
    .string()
    .min(3, "El motivo debe tener al menos 3 caracteres")
    .max(300, "El motivo no puede exceder los 300 caracteres"),
});

export type CreateTurnInput = z.infer<typeof createTurnSchema>;
export type CancelTurnInput = z.infer<typeof cancelTurnSchema>;
export type WorkerCancelTurnInput = z.infer<typeof workerCancelTurnSchema>;

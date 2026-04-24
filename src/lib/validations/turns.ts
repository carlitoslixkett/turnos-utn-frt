import { z } from "zod";

export const createTurnSchema = z.object({
  note_id: z.string().uuid("Seleccioná un tipo de trámite"),
  preferred_date: z.string().datetime("Fecha no válida"),
  context_data: z.record(z.string(), z.string()).optional(),
});

export const cancelTurnSchema = z.object({
  turn_id: z.string().uuid(),
  security_code: z
    .string()
    .min(6, "El código de seguridad debe tener 6 caracteres")
    .max(6, "El código de seguridad debe tener 6 caracteres"),
});

export type CreateTurnInput = z.infer<typeof createTurnSchema>;
export type CancelTurnInput = z.infer<typeof cancelTurnSchema>;

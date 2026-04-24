import { z } from "zod";

export const createNoteSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100),
  description: z.string().max(500).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const updateNoteSchema = createNoteSchema.extend({
  is_active: z.boolean().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

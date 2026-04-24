import { z } from "zod";

export const createNewsSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres").max(200),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres").max(5000),
  scheduled_at: z.string().datetime().optional(),
});

export const updateNewsSchema = createNewsSchema.partial();

export type CreateNewsInput = z.infer<typeof createNewsSchema>;
export type UpdateNewsInput = z.infer<typeof updateNewsSchema>;

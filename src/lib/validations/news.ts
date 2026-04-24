import { z } from "zod";

const newsStatus = z.enum(["posted", "pending", "deleted"]);

export const createNewsSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres").max(200),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres").max(5000),
  status: newsStatus.default("pending"),
  scheduled_at: z.string().datetime().optional(),
});

export const updateNewsSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres").max(200).optional(),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(5000)
    .optional(),
  status: newsStatus.optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
});

export type CreateNewsInput = z.infer<typeof createNewsSchema>;
export type UpdateNewsInput = z.infer<typeof updateNewsSchema>;

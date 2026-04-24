import { z } from "zod";

const emailSchema = z
  .string()
  .email("El email no es válido")
  .refine((email) => {
    // Domain validation happens server-side; client shows generic message
    return email.includes("@");
  }, "El email no es válido");

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre es demasiado largo"),
  dni: z
    .string()
    .min(7, "El DNI debe tener al menos 7 dígitos")
    .max(8, "El DNI no puede tener más de 8 dígitos")
    .regex(/^\d+$/, "El DNI solo debe contener números"),
  email: emailSchema,
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^[\d\s\-+()]{6,20}$/.test(v), "El teléfono no es válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
  legajo: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

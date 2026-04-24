"use server";

import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validations/auth";
import { isAllowedEmailDomain } from "@/lib/auth/validate-domain";
import { writeAuditLog } from "@/lib/utils/audit";
import { redirect } from "next/navigation";

export async function registerAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = registerSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password, full_name, dni, phone, legajo } = parsed.data;

  if (!isAllowedEmailDomain(email)) {
    return { error: "Solo se aceptan emails institucionales (@frt.utn.edu.ar)" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        full_name,
        dni,
        phone: phone ?? null,
        legajo: legajo ?? null,
        user_type: "student",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await writeAuditLog({
      actorId: data.user.id,
      action: "user.register",
      entityType: "profiles",
      entityId: data.user.id,
      payload: { user_type: "student" },
    });
  }

  redirect("/verify?email=" + encodeURIComponent(email));
}

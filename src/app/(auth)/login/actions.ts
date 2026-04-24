"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";
import { writeAuditLog } from "@/lib/utils/audit";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Don't reveal whether email or password is wrong
    return { error: "Email o contraseña incorrectos" };
  }

  if (data.user) {
    await writeAuditLog({
      actorId: data.user.id,
      action: "user.login",
      entityType: "profiles",
      entityId: data.user.id,
    });
  }

  redirect("/home");
}

export async function logoutAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await writeAuditLog({
      actorId: user.id,
      action: "user.logout",
      entityType: "profiles",
      entityId: user.id,
    });
  }

  await supabase.auth.signOut();
  redirect("/login");
}

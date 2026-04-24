import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/utils/audit";
import { isAllowedEmailDomain } from "@/lib/auth/validate-domain";
import { z } from "zod";

const createWorkerSchema = z.object({
  full_name: z.string().min(3, "Nombre demasiado corto").max(100),
  email: z.string().email("Email inválido"),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener una mayúscula")
    .regex(/[0-9]/, "Debe contener un número"),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Only admins
  const { data: adminRole } = await supabase
    .from("worker_roles")
    .select("role")
    .eq("worker_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!adminRole) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { data, error } = await adminClient
    .from("profiles")
    .select("*, worker_roles(role)")
    .eq("user_type", "worker")
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: adminRole } = await supabase
    .from("worker_roles")
    .select("role")
    .eq("worker_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!adminRole) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const body = await request.json();
  const parsed = createWorkerSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  if (!isAllowedEmailDomain(parsed.data.email))
    return NextResponse.json(
      { error: "Solo se permiten emails institucionales (@frt.utn.edu.ar)" },
      { status: 400 }
    );

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      dni: parsed.data.dni,
      user_type: "worker",
    },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    action: "worker.create",
    entityType: "profiles",
    entityId: authUser.user.id,
    payload: { full_name: parsed.data.full_name, email: parsed.data.email },
  });

  return NextResponse.json(
    { data: { id: authUser.user.id, email: parsed.data.email } },
    { status: 201 }
  );
}

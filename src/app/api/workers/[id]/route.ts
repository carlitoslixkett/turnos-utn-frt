import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const updateWorkerSchema = z.object({
  is_admin: z.boolean().optional(),
  deactivate: z.boolean().optional(),
});

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("worker_roles")
    .select("role")
    .eq("worker_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!(await requireAdmin(supabase, user.id)))
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const body = await request.json();
  const parsed = updateWorkerSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { is_admin, deactivate } = parsed.data;

  if (is_admin !== undefined) {
    if (is_admin) {
      await adminClient
        .from("worker_roles")
        .upsert({ worker_id: id, role: "admin" }, { onConflict: "worker_id,role" });
    } else {
      await adminClient.from("worker_roles").delete().eq("worker_id", id).eq("role", "admin");
    }

    await writeAuditLog({
      actorId: user.id,
      action: is_admin ? "worker.grant_admin" : "worker.revoke_admin",
      entityType: "profiles",
      entityId: id,
      payload: {},
    });
  }

  if (deactivate) {
    const { error } = await adminClient.auth.admin.updateUserById(id, { ban_duration: "87600h" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeAuditLog({
      actorId: user.id,
      action: "worker.deactivate",
      entityType: "profiles",
      entityId: id,
      payload: {},
    });
  }

  return NextResponse.json({ success: true });
}

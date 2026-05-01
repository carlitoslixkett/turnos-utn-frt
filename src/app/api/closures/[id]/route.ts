import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/utils/audit";

// DELETE /api/closures/[id] — removes a closure. Does NOT restore previously
// cancelled turns (they stay cancelled — students would already have been
// notified by email).
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();
  if (!profile || profile.user_type !== "worker") {
    return NextResponse.json(
      { error: "Solo los empleados pueden eliminar cierres" },
      { status: 403 }
    );
  }

  const { data: existing } = await adminClient
    .from("office_closures")
    .select("*")
    .eq("id", id)
    .single();
  if (!existing) {
    return NextResponse.json({ error: "Cierre no encontrado" }, { status: 404 });
  }

  const { error: delError } = await adminClient.from("office_closures").delete().eq("id", id);
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    action: "closure.delete",
    entityType: "office_closures",
    entityId: id,
    payload: {
      date_start: existing.date_start,
      date_end: existing.date_end,
      reason: existing.reason,
    },
  });

  return NextResponse.json({ ok: true });
}

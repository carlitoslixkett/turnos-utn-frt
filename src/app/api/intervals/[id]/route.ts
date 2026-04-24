import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { updateIntervalSchema } from "@/lib/validations/intervals";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("intervals")
    .select("*, interval_notes(note_id, notes(id, name))")
    .eq("id", id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Intervalo no encontrado" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  if (!profile || profile.user_type !== "worker")
    return NextResponse.json(
      { error: "Solo los empleados pueden editar intervalos" },
      { status: 403 }
    );

  const body = await request.json();
  const parsed = updateIntervalSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  // If deactivating, cancel pending turns and notify students
  if (parsed.data.is_active === false) {
    const { data: pendingTurns } = await adminClient
      .from("turns")
      .select("id, student_id, date, notes(name), profiles(full_name, email)")
      .eq("interval_id", id)
      .eq("status", "pending");

    if (pendingTurns && pendingTurns.length > 0) {
      await adminClient
        .from("turns")
        .update({ status: "cancelled" })
        .eq("interval_id", id)
        .eq("status", "pending");

      for (const turn of pendingTurns) {
        await writeAuditLog({
          actorId: user.id,
          action: "turn.cancel_by_interval_deactivation",
          entityType: "turns",
          entityId: turn.id,
          payload: { interval_id: id, reason: "interval_deactivated" },
        });
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { note_ids: _note_ids, ...intervalUpdate } = parsed.data;

  const { data: interval, error } = await adminClient
    .from("intervals")
    .update(intervalUpdate)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    action: "interval.update",
    entityType: "intervals",
    entityId: id,
    payload: parsed.data as Record<string, unknown>,
  });

  return NextResponse.json({ data: interval });
}

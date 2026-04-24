import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { updateNoteSchema } from "@/lib/validations/notes";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase.from("notes").select("*").eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
    return NextResponse.json({ error: "Solo los empleados pueden editar notas" }, { status: 403 });

  const body = await request.json();
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  // Block deactivation if note is used in pending turns or active intervals
  if (parsed.data.is_active === false) {
    const { data: pendingTurns } = await adminClient
      .from("turns")
      .select("id")
      .eq("note_id", params.id)
      .eq("status", "pending")
      .limit(1);

    if (pendingTurns && pendingTurns.length > 0)
      return NextResponse.json(
        {
          error:
            "No podés desactivar esta nota porque tiene turnos pendientes. Cancelalos primero.",
        },
        { status: 409 }
      );

    const { data: activeIntervals } = await adminClient
      .from("interval_notes")
      .select("intervals!inner(is_active)")
      .eq("note_id", params.id)
      .limit(1);

    const hasActive = activeIntervals?.some(
      (r) => (r.intervals as { is_active: boolean } | null)?.is_active
    );
    if (hasActive)
      return NextResponse.json(
        { error: "No podés desactivar esta nota porque está en un intervalo activo." },
        { status: 409 }
      );
  }

  const { data: note, error } = await adminClient
    .from("notes")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(parsed.data as any)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: user.id,
    action: "note.update",
    entityType: "notes",
    entityId: params.id,
    payload: parsed.data as Record<string, unknown>,
  });

  return NextResponse.json({ data: note });
}

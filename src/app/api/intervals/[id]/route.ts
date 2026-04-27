import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { updateIntervalSchema } from "@/lib/validations/intervals";
import { writeAuditLog } from "@/lib/utils/audit";
import { sendEmail } from "@/lib/email/send";
import { intervalDeactivatedEmail } from "@/lib/email/templates";
import { countSlots } from "@/lib/utils/interval-slots";
import {
  dateOnlyToOfficeEnd,
  dateOnlyToOfficeStart,
  getOfficeSettings,
} from "@/lib/utils/office-settings";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
    const { data: intervalData } = await adminClient
      .from("intervals")
      .select("name")
      .eq("id", id)
      .single();

    const { data: pendingTurns } = await adminClient
      .from("turns")
      .select("id, student_id, date, profile:profiles(full_name)")
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

        const profileData = turn.profile as { full_name: string } | null;
        const { data: studentAuth } = await adminClient.auth.admin.getUserById(turn.student_id);
        if (studentAuth?.user?.email) {
          const tpl = intervalDeactivatedEmail({
            fullName: profileData?.full_name ?? "Estudiante",
            intervalName: intervalData?.name ?? "Intervalo",
            turnDate: format(new Date(turn.date), "EEEE d 'de' MMMM, HH:mm", { locale: es }),
            explanation: parsed.data.explain_desactivate ?? null,
          });
          await sendEmail({ to: studentAuth.user.email, subject: tpl.subject, html: tpl.html });
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { note_ids: _note_ids, ...intervalUpdate } = parsed.data;

  // Normalize date inputs (accept plain YYYY-MM-DD)
  const updatePayload: Record<string, unknown> = { ...intervalUpdate };
  if (typeof intervalUpdate.date_start === "string") {
    updatePayload.date_start = /^\d{4}-\d{2}-\d{2}$/.test(intervalUpdate.date_start)
      ? dateOnlyToOfficeStart(intervalUpdate.date_start)
      : new Date(intervalUpdate.date_start).toISOString();
  }
  if (typeof intervalUpdate.date_end === "string") {
    updatePayload.date_end = /^\d{4}-\d{2}-\d{2}$/.test(intervalUpdate.date_end)
      ? dateOnlyToOfficeEnd(intervalUpdate.date_end)
      : new Date(intervalUpdate.date_end).toISOString();
  }

  const recalculatesQuantity =
    intervalUpdate.date_start !== undefined || intervalUpdate.date_end !== undefined;

  if (recalculatesQuantity) {
    const { data: current } = await adminClient
      .from("intervals")
      .select("date_start, date_end")
      .eq("id", id)
      .single();
    if (!current) return NextResponse.json({ error: "Intervalo no encontrado" }, { status: 404 });

    const dateStart = new Date((updatePayload.date_start as string) ?? current.date_start);
    const dateEnd = new Date((updatePayload.date_end as string) ?? current.date_end);
    const settings = await getOfficeSettings();

    const turnQuantity = countSlots(
      dateStart,
      dateEnd,
      settings.turn_duration_minutes,
      settings.attention_windows
    );
    if (turnQuantity === 0 && intervalUpdate.is_active !== false) {
      return NextResponse.json(
        { error: "Los horarios de atención no generan ningún turno en el rango de fechas" },
        { status: 400 }
      );
    }
    updatePayload.turn_quantity = turnQuantity;
    updatePayload.turn_duration_minutes = settings.turn_duration_minutes;
  }

  const { data: interval, error } = await adminClient
    .from("intervals")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updatePayload as any)
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

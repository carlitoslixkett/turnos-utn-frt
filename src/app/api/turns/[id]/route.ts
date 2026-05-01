import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { cancelTurnSchema, workerCancelTurnSchema } from "@/lib/validations/turns";
import { writeAuditLog } from "@/lib/utils/audit";
import { sendEmail } from "@/lib/email/send";
import { cancelLockoutEmail, turnCancelledByWorkerEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/utils/notifications";
import bcrypt from "bcryptjs";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";

const CANCEL_BLOCK_MINUTES = 5;
const MAX_CANCEL_ATTEMPTS = 3;
const MIN_DAYS_BEFORE_CANCEL = 3;

// PATCH /api/turns/[id] — attend (worker F10/F12) or cancel (student)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await adminClient
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const { data: turn } = await adminClient.from("turns").select("*").eq("id", id).single();

  if (!turn) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

  const body = await request.json();
  const { action } = body;

  // Worker: attend (F10) or mark lost (F12)
  if (profile.user_type === "worker") {
    if (action === "attend") {
      await adminClient
        .from("turns")
        .update({ status: "attended", attended_at: new Date().toISOString() })
        .eq("id", id);
      await writeAuditLog({
        actorId: user.id,
        action: "turn.attend",
        entityType: "turns",
        entityId: id,
      });
      return NextResponse.json({ message: "Turno atendido" });
    }
    if (action === "lost") {
      await adminClient.from("turns").update({ status: "lost" }).eq("id", id);
      await writeAuditLog({
        actorId: user.id,
        action: "turn.lost",
        entityType: "turns",
        entityId: id,
      });
      return NextResponse.json({ message: "Turno marcado como ausente" });
    }
    if (action === "cancel") {
      if (turn.status !== "pending") {
        return NextResponse.json(
          { error: "Solo se pueden cancelar turnos pendientes" },
          { status: 409 }
        );
      }
      const parsed = workerCancelTurnSchema.safeParse({ reason: body.reason });
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }
      const reason = parsed.data.reason.trim();

      await adminClient
        .from("turns")
        .update({ status: "cancelled", cancel_reason: reason })
        .eq("id", id);

      await writeAuditLog({
        actorId: user.id,
        action: "turn.cancel_by_worker",
        entityType: "turns",
        entityId: id,
        payload: { reason },
      });

      // Notify the student (in-app + email best-effort)
      const turnDateStr = format(new Date(turn.date), "EEEE d 'de' MMMM, HH:mm", { locale: es });

      await createNotification({
        userId: turn.student_id,
        type: "turn_cancelled_by_worker",
        title: "Tu turno fue cancelado",
        body: `El Departamento de Alumnos canceló tu turno del ${turnDateStr}. Motivo: ${reason}`,
        link: "/mis-turnos",
      });

      const { data: studentProfile } = await adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", turn.student_id)
        .single();
      const { data: studentAuth } = await adminClient.auth.admin.getUserById(turn.student_id);
      if (studentAuth?.user?.email) {
        const tpl = turnCancelledByWorkerEmail({
          fullName: studentProfile?.full_name ?? "Estudiante",
          turnDate: turnDateStr,
          reason,
        });
        await sendEmail({ to: studentAuth.user.email, subject: tpl.subject, html: tpl.html });
      }

      return NextResponse.json({ message: "Turno cancelado y estudiante notificado" });
    }
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }

  // Student: cancel
  if (action === "cancel") {
    if (turn.student_id !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (turn.status !== "pending") {
      return NextResponse.json({ error: "Solo podés cancelar turnos pendientes" }, { status: 409 });
    }

    // Check block
    if (turn.cancel_blocked_until && new Date(turn.cancel_blocked_until) > new Date()) {
      const remaining = Math.ceil(
        (new Date(turn.cancel_blocked_until).getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Intentá en ${remaining} minuto(s).` },
        { status: 429 }
      );
    }

    // Rule: must be 3+ days before turn
    const daysUntilTurn = differenceInDays(new Date(turn.date), new Date());
    if (daysUntilTurn < MIN_DAYS_BEFORE_CANCEL) {
      return NextResponse.json(
        {
          error: `Solo podés cancelar con al menos ${MIN_DAYS_BEFORE_CANCEL} días de anticipación`,
        },
        { status: 409 }
      );
    }

    // Validate security code
    const parsed = cancelTurnSchema.safeParse({
      turn_id: id,
      security_code: body.security_code,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const valid = await bcrypt.compare(parsed.data.security_code, turn.security_code_hash);
    if (!valid) {
      const newAttempts = (turn.cancel_attempts ?? 0) + 1;
      const updates: Record<string, unknown> = { cancel_attempts: newAttempts };

      if (newAttempts >= MAX_CANCEL_ATTEMPTS) {
        updates.cancel_blocked_until = new Date(
          Date.now() + CANCEL_BLOCK_MINUTES * 60000
        ).toISOString();
      }

      await adminClient
        .from("turns")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updates as any)
        .eq("id", id);
      await writeAuditLog({
        actorId: user.id,
        action: "turn.cancel_attempt_failed",
        entityType: "turns",
        entityId: id,
      });

      const remaining = MAX_CANCEL_ATTEMPTS - newAttempts;
      if (remaining <= 0) {
        const { data: studentProfile } = await adminClient
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        const { data: studentAuth } = await adminClient.auth.admin.getUserById(user.id);
        if (studentAuth?.user?.email) {
          const tpl = cancelLockoutEmail({
            fullName: studentProfile?.full_name ?? "Estudiante",
            blockMinutes: CANCEL_BLOCK_MINUTES,
          });
          await sendEmail({ to: studentAuth.user.email, subject: tpl.subject, html: tpl.html });
        }
        return NextResponse.json(
          { error: `Código incorrecto. Opción bloqueada por ${CANCEL_BLOCK_MINUTES} minutos.` },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error: `Código incorrecto. Te ${remaining === 1 ? "queda 1 intento" : `quedan ${remaining} intentos`}.`,
        },
        { status: 400 }
      );
    }

    await adminClient
      .from("turns")
      .update({ status: "cancelled", cancel_attempts: 0, cancel_blocked_until: null })
      .eq("id", id);

    await writeAuditLog({
      actorId: user.id,
      action: "turn.cancel",
      entityType: "turns",
      entityId: id,
    });

    return NextResponse.json({ message: "Turno cancelado exitosamente" });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}

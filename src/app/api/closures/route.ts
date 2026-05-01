import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { createClosureSchema } from "@/lib/validations/closures";
import { writeAuditLog } from "@/lib/utils/audit";
import { sendEmail } from "@/lib/email/send";
import { turnCancelledByClosureEmail } from "@/lib/email/templates";
import { createNotification } from "@/lib/utils/notifications";
import { dateOnlyToOfficeStart, dateOnlyToOfficeEnd } from "@/lib/utils/office-settings";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { OFFICE_TZ } from "@/lib/utils/interval-slots";

// GET /api/closures?from=YYYY-MM-DD&to=YYYY-MM-DD (optional filters)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const upcomingOnly = searchParams.get("upcoming_only") === "1";

  const admin = await createAdminClient();
  let q = admin.from("office_closures").select("*").order("date_start", { ascending: true });

  if (from) q = q.gte("date_end", from);
  if (to) q = q.lte("date_start", to);
  if (upcomingOnly) {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: OFFICE_TZ });
    q = q.gte("date_end", today);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/closures
// Body: { date_start, date_end, all_day, start_time?, end_time?, reason, confirm? }
// Phase 1 (confirm omitted/false): returns affected pending turns count → UI confirms.
// Phase 2 (confirm: true): creates the closure, cancels affected turns, emails students.
export async function POST(request: NextRequest) {
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
      { error: "Solo los empleados pueden gestionar cierres" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createClosureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // No retroactive closures
  const today = new Date().toLocaleDateString("en-CA", { timeZone: OFFICE_TZ });
  if (parsed.data.date_end < today) {
    return NextResponse.json(
      { error: "No podés crear un cierre en fechas pasadas" },
      { status: 400 }
    );
  }

  // Find affected pending turns (within the date range and, if partial, within the time range)
  const startIso = dateOnlyToOfficeStart(parsed.data.date_start);
  const endIso = dateOnlyToOfficeEnd(parsed.data.date_end);

  const { data: candidateTurns } = await adminClient
    .from("turns")
    .select("id, student_id, date, profile:profiles(full_name)")
    .eq("status", "pending")
    .gte("date", startIso)
    .lte("date", endIso);

  // For partial closures, filter further by time-of-day in office TZ
  const startHm = parsed.data.start_time ?? null;
  const endHm = parsed.data.end_time ?? null;
  const affected = (candidateTurns ?? []).filter((t) => {
    if (parsed.data.all_day) return true;
    if (!startHm || !endHm) return false;
    const hm = new Intl.DateTimeFormat("en-GB", {
      timeZone: OFFICE_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(t.date as string));
    return hm >= startHm && hm < endHm;
  });

  // Phase 1: dry run
  if (!parsed.data.confirm) {
    return NextResponse.json({
      affected_count: affected.length,
      requires_confirmation: affected.length > 0,
    });
  }

  // Phase 2: create the closure
  const { data: created, error: insertError } = await adminClient
    .from("office_closures")
    .insert({
      date_start: parsed.data.date_start,
      date_end: parsed.data.date_end,
      all_day: parsed.data.all_day,
      start_time: parsed.data.all_day ? null : (startHm ?? null),
      end_time: parsed.data.all_day ? null : (endHm ?? null),
      reason: parsed.data.reason.trim(),
      created_by: user.id,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user.id,
    action: "closure.create",
    entityType: "office_closures",
    entityId: created.id,
    payload: {
      date_start: created.date_start,
      date_end: created.date_end,
      reason: created.reason,
      cancelled_count: affected.length,
    },
  });

  // Cancel affected turns + notify
  if (affected.length > 0) {
    await adminClient
      .from("turns")
      .update({ status: "cancelled", cancel_reason: created.reason })
      .in(
        "id",
        affected.map((t) => t.id as string)
      );

    for (const t of affected) {
      await writeAuditLog({
        actorId: user.id,
        action: "turn.cancel_by_closure",
        entityType: "turns",
        entityId: t.id as string,
        payload: { closure_id: created.id, reason: created.reason },
      });

      const profileData = t.profile as { full_name: string } | null;
      const turnDateStr = format(new Date(t.date as string), "EEEE d 'de' MMMM, HH:mm", {
        locale: es,
      });

      // In-app notification (works always, no setup needed)
      await createNotification({
        userId: t.student_id as string,
        type: "turn_cancelled_by_closure",
        title: "Tu turno fue cancelado",
        body: `Tu turno del ${turnDateStr} fue cancelado porque la oficina no atenderá. Motivo: ${created.reason}`,
        link: "/mis-turnos",
      });

      // Email (best-effort — only delivers if Resend is configured for the recipient)
      const { data: studentAuth } = await adminClient.auth.admin.getUserById(
        t.student_id as string
      );
      if (studentAuth?.user?.email) {
        const tpl = turnCancelledByClosureEmail({
          fullName: profileData?.full_name ?? "Estudiante",
          turnDate: turnDateStr,
          reason: created.reason,
        });
        await sendEmail({ to: studentAuth.user.email, subject: tpl.subject, html: tpl.html });
      }
    }
  }

  return NextResponse.json({
    data: created,
    cancelled_count: affected.length,
  });
}

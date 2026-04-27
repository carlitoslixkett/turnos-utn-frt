import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { createTurnSchema } from "@/lib/validations/turns";
import { writeAuditLog } from "@/lib/utils/audit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateSlots, parseWindows } from "@/lib/utils/interval-slots";

// GET /api/turns — list turns (student sees own, worker sees all)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const note_id = searchParams.get("note_id");
  const interval_id = searchParams.get("interval_id");
  const student_id = searchParams.get("student_id");

  let query = supabase
    .from("turns")
    .select(
      "*, note:notes(id, name), interval:intervals(id, name, date_start, date_end), profile:profiles(id, full_name, legajo)"
    )
    .order("date", { ascending: true });

  if (profile.user_type !== "worker") {
    query = query.eq("student_id", user.id);
  } else if (student_id) {
    query = query.eq("student_id", student_id);
  }

  if (status) query = query.eq("status", status as "pending" | "attended" | "lost" | "cancelled");
  if (note_id) query = query.eq("note_id", note_id);
  if (interval_id) query = query.eq("interval_id", interval_id);
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query = query.gte("date", start.toISOString()).lte("date", end.toISOString());
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/turns — create turn with automatic slot assignment
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = createTurnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { note_id, preferred_date, selected_date, selected_interval_id } = parsed.data;
  const preferredDate = new Date(selected_date ?? preferred_date!);

  // Rule 1: student cannot have 2 pending turns with same note
  const { data: existing } = await adminClient
    .from("turns")
    .select("id")
    .eq("student_id", user.id)
    .eq("note_id", note_id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Ya tenés un turno pendiente para este tipo de trámite" },
      { status: 409 }
    );
  }

  // Path A: student picked an exact slot — validate it belongs to a valid window and isn't taken
  if (selected_date) {
    const slotDate = new Date(selected_date);
    let intervalQuery = adminClient
      .from("intervals")
      .select("*, interval_notes!inner(note_id)")
      .eq("is_active", true)
      .eq("interval_notes.note_id", note_id)
      .lte("date_start", slotDate.toISOString())
      .gte("date_end", slotDate.toISOString());
    if (selected_interval_id) intervalQuery = intervalQuery.eq("id", selected_interval_id);

    const { data: candidateIntervals } = await intervalQuery;
    const matchingInterval = (candidateIntervals ?? []).find((interval) => {
      const duration = interval.turn_duration_minutes as number;
      const windows = parseWindows(interval.attention_windows);
      const dayStart = new Date(slotDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(slotDate);
      dayEnd.setHours(23, 59, 59, 999);
      const slots = generateSlots(dayStart, dayEnd, duration, windows);
      return slots.some((s) => s.getTime() === slotDate.getTime());
    });

    if (!matchingInterval) {
      return NextResponse.json(
        { error: "Ese horario no está disponible para este trámite" },
        { status: 400 }
      );
    }

    const { data: taken } = await adminClient
      .from("turns")
      .select("id")
      .eq("interval_id", matchingInterval.id)
      .eq("date", slotDate.toISOString())
      .in("status", ["pending", "attended"])
      .maybeSingle();

    if (taken) {
      return NextResponse.json(
        { error: "Ese horario ya fue tomado por otro estudiante" },
        { status: 409 }
      );
    }

    const securityCode = crypto.randomInt(100000, 999999).toString();
    const securityCodeHash = await bcrypt.hash(securityCode, 12);

    const { data: turn, error: turnError } = await adminClient
      .from("turns")
      .insert({
        student_id: user.id,
        interval_id: matchingInterval.id,
        note_id,
        date: slotDate.toISOString(),
        status: "pending",
        security_code_hash: securityCodeHash,
        cancel_attempts: 0,
      })
      .select("*")
      .single();

    if (turnError) {
      // 23505 = unique_violation (uniq_turns_interval_date_active)
      if ((turnError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "Ese horario ya fue tomado por otro estudiante" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Error al crear el turno" }, { status: 500 });
    }

    await writeAuditLog({
      actorId: user.id,
      action: "turn.create",
      entityType: "turns",
      entityId: turn.id,
      payload: {
        note_id,
        interval_id: matchingInterval.id,
        date: slotDate.toISOString(),
        mode: "selected",
      },
    });

    return NextResponse.json(
      {
        data: { ...turn, security_code: securityCode },
        message: "Turno creado exitosamente. Guardá tu código de seguridad.",
      },
      { status: 201 }
    );
  }

  // Find best interval: active, contains preferred_date, has note, has capacity
  const { data: intervals } = await adminClient
    .from("intervals")
    .select("*, interval_notes!inner(note_id)")
    .eq("is_active", true)
    .eq("interval_notes.note_id", note_id)
    .lte("date_start", preferredDate.toISOString())
    .gte("date_end", preferredDate.toISOString());

  if (!intervals || intervals.length === 0) {
    return NextResponse.json(
      { error: "No hay intervalos disponibles para este trámite en la fecha seleccionada" },
      { status: 404 }
    );
  }

  // Build candidates: compute remaining capacity + best slot per interval
  type Candidate = {
    interval: (typeof intervals)[number];
    slot: Date;
    remaining: number;
  };
  const candidates: Candidate[] = [];

  for (const interval of intervals) {
    const { data: existingTurns } = await adminClient
      .from("turns")
      .select("date")
      .eq("interval_id", interval.id)
      .neq("status", "cancelled");

    const takenSlots = new Set((existingTurns ?? []).map((t: { date: string }) => t.date));
    const duration = interval.turn_duration_minutes as number;
    const dateStart = new Date(interval.date_start as string);
    const dateEnd = new Date(interval.date_end as string);
    const windows = parseWindows(interval.attention_windows);

    const allSlots = generateSlots(dateStart, dateEnd, duration, windows);
    const totalSlots = allSlots.length;

    let slot: Date | null = null;
    for (const candidate of allSlots) {
      if (!takenSlots.has(candidate.toISOString()) && candidate >= preferredDate) {
        slot = candidate;
        break;
      }
    }
    if (!slot) {
      for (const candidate of allSlots) {
        if (!takenSlots.has(candidate.toISOString())) {
          slot = candidate;
          break;
        }
      }
    }

    if (slot) {
      candidates.push({ interval, slot, remaining: totalSlots - takenSlots.size });
    }
  }

  // Rule: pick interval with MOST remaining turn_quantity (per use-case spec)
  candidates.sort((a, b) => b.remaining - a.remaining);
  const winner = candidates[0] ?? null;
  const assignedInterval = winner?.interval ?? null;
  const assignedSlot: Date | null = winner?.slot ?? null;

  if (!assignedInterval || !assignedSlot) {
    return NextResponse.json(
      { error: "No hay cupos disponibles para este trámite en la fecha seleccionada" },
      { status: 409 }
    );
  }

  // Generate security code (6 digits) and hash it
  const securityCode = crypto.randomInt(100000, 999999).toString();
  const securityCodeHash = await bcrypt.hash(securityCode, 12);

  const { data: turn, error: turnError } = await adminClient
    .from("turns")
    .insert({
      student_id: user.id,
      interval_id: assignedInterval.id,
      note_id,
      date: assignedSlot.toISOString(),
      status: "pending",
      security_code_hash: securityCodeHash,
      cancel_attempts: 0,
    })
    .select("*")
    .single();

  if (turnError) {
    if ((turnError as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "Ese horario fue tomado mientras procesábamos. Probá otra vez." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Error al crear el turno" }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user.id,
    action: "turn.create",
    entityType: "turns",
    entityId: turn.id,
    payload: { note_id, interval_id: assignedInterval.id, date: assignedSlot.toISOString() },
  });

  // Return security code ONLY on creation — never again
  return NextResponse.json(
    {
      data: { ...turn, security_code: securityCode },
      message: "Turno creado exitosamente. Guardá tu código de seguridad.",
    },
    { status: 201 }
  );
}

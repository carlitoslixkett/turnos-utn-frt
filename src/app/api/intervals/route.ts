import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { createIntervalSchema } from "@/lib/validations/intervals";
import { writeAuditLog } from "@/lib/utils/audit";
import { countSlots } from "@/lib/utils/interval-slots";
import {
  dateOnlyToOfficeEnd,
  dateOnlyToOfficeStart,
  getGlobalAttentionWindows,
} from "@/lib/utils/office-settings";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const is_active = searchParams.get("is_active");
  const note_id = searchParams.get("note_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("intervals")
    .select("*, interval_notes(note_id, notes(id, name))")
    .order("date_start", { ascending: true });

  if (is_active !== null) query = query.eq("is_active", is_active === "true");
  if (from) query = query.gte("date_end", from);
  if (to) query = query.lte("date_start", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by note_id post-query (join filter)
  const filtered = note_id
    ? data?.filter((i) =>
        (i.interval_notes as { note_id: string }[] | null)?.some((n) => n.note_id === note_id)
      )
    : data;

  return NextResponse.json({ data: filtered });
}

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
  if (!profile || profile.user_type !== "worker")
    return NextResponse.json(
      { error: "Solo los empleados pueden crear intervalos" },
      { status: 403 }
    );

  const body = await request.json();
  const parsed = createIntervalSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { note_ids, ...intervalData } = parsed.data;

  // Normalize date inputs: if a plain YYYY-MM-DD was sent, anchor to office TZ start/end
  const dateStartIso = /^\d{4}-\d{2}-\d{2}$/.test(intervalData.date_start)
    ? dateOnlyToOfficeStart(intervalData.date_start)
    : new Date(intervalData.date_start).toISOString();
  const dateEndIso = /^\d{4}-\d{2}-\d{2}$/.test(intervalData.date_end)
    ? dateOnlyToOfficeEnd(intervalData.date_end)
    : new Date(intervalData.date_end).toISOString();

  const globalWindows = await getGlobalAttentionWindows();

  if (globalWindows.length === 0) {
    return NextResponse.json(
      {
        error: "Configurá primero los horarios de atención en la sección 'Horarios de Atención'.",
      },
      { status: 400 }
    );
  }

  const turnQuantity = countSlots(
    new Date(dateStartIso),
    new Date(dateEndIso),
    intervalData.turn_duration_minutes,
    globalWindows
  );

  if (turnQuantity === 0) {
    return NextResponse.json(
      { error: "Los horarios de atención no generan ningún turno en el rango de fechas" },
      { status: 400 }
    );
  }

  const { data: interval, error } = await adminClient
    .from("intervals")
    .insert({
      ...intervalData,
      date_start: dateStartIso,
      date_end: dateEndIso,
      turn_quantity: turnQuantity,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert interval_notes
  const noteLinks = note_ids.map((note_id) => ({ interval_id: interval.id, note_id }));
  await adminClient.from("interval_notes").insert(noteLinks);

  await writeAuditLog({
    actorId: user.id,
    action: "interval.create",
    entityType: "intervals",
    entityId: interval.id,
    payload: { name: interval.name, date_start: interval.date_start, note_ids },
  });

  return NextResponse.json({ data: interval }, { status: 201 });
}
